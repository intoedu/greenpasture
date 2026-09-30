// ============================================================
//  주식회사 그린파스처 · 온라인 문의·신청 접수 함수 (submit-inquiry)
//
//  홈페이지 양식은 데이터베이스에 직접 접근하지 않습니다. 반드시 이 함수를 거칩니다.
//  여기서 하는 일:
//    1) 보낸 곳이 우리 홈페이지가 맞는지 확인 (CORS)
//    2) 사람이 보낸 것이 맞는지 확인 (허니팟 + Turnstile 캡차)
//    3) 같은 곳에서 짧은 시간에 여러 번 넣는 것을 차단 (10분 3건 · 하루 10건)
//    4) 값이 정상인지, 개인정보 수집·이용 동의를 받았는지 확인
//    5) 통과한 것만 데이터베이스(inquiries)에 저장
//    6) (설정된 경우) 담당자 메일로 알림 발송 — 답장하면 고객에게 바로 회신됩니다
//
//  환경변수 (Supabase 대시보드 > Edge Functions > Secrets)
//    IP_SALT               권장. IP 해시에 쓰는 임의의 긴 문자열. 한 번 정하면 바꾸지 마십시오.
//    ALLOWED_ORIGINS       선택. 쉼표로 구분. 없으면 아래 기본 목록 사용.
//    TURNSTILE_SECRET_KEY  선택. 없으면 캡차 검사를 건너뜁니다.
//    RESEND_API_KEY        선택. 있으면 신규 접수 시 메일 알림.
//    NOTIFY_TO             알림 받을 주소. 여러 명이면 쉼표로 구분.
//    NOTIFY_FROM           발신 주소. 예) 그린파스처 <no-reply@greenpasture.co.kr>
//    ADMIN_URL             선택. 알림 메일에 넣을 관리자 패널 주소.
//
//  SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · SUPABASE_SECRET_KEYS 는
//  Supabase 가 자동으로 넣어 주므로 직접 등록하지 않습니다.
//
//  응답: 성공 200 {"ok":true} / 실패 4xx·5xx {"ok":false,"error":"<코드>"}
//  오류 코드: kind_invalid, company_required, name_invalid, phone_invalid, email_invalid,
//            date_invalid, date_required, message_required, consent_required, captcha_failed,
//            rate_limited, origin_not_allowed, method_not_allowed, bad_json, server_error
// ============================================================

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const SERVICE_KEY = pickServiceKey();
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
const IP_SALT = Deno.env.get("IP_SALT") ?? "greenpasture-default-salt-change-me";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_TO = (Deno.env.get("NOTIFY_TO") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const NOTIFY_FROM = (Deno.env.get("NOTIFY_FROM") ?? "").trim();
const ADMIN_URL = (Deno.env.get("ADMIN_URL") ?? "").trim() ||
  "https://www.greenpasture.co.kr/admin.html";

const DEFAULT_ORIGINS = [
  "https://www.greenpasture.co.kr",
  "https://greenpasture.co.kr",
  "https://www.vzero.co.kr",
  "https://vzero.co.kr",
  "https://intoedu.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];
const ENV_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
const ORIGINS = ENV_ORIGINS.length ? ENV_ORIGINS : DEFAULT_ORIGINS;

/* 짧은 시간에 몰아넣는 것을 막는 기준 */
const LIMIT_10MIN = 3;
const LIMIT_DAY = 10;

/* 요청 본문이 이보다 크면 정상적인 양식 접수가 아닙니다 */
const MAX_BODY_CHARS = 64_000;

/* 접수 구분 — 알림 메일 제목·본문에 쓰는 이름 */
const KIND_LABEL: Record<string, string> = {
  contact: "문의",
  quote: "견적 요청",
  sample: "샘플 신청",
  visit: "시공 상담·현장 방문 예약",
  partner: "파트너·대리점 신청",
  catalog: "카탈로그·시험성적서 요청",
};
const KINDS = new Set(Object.keys(KIND_LABEL));

const TIME_LABEL: Record<string, string> = { am: "오전", pm: "오후", any: "상관없음" };
const TIMES = new Set(Object.keys(TIME_LABEL));

type ErrorCode =
  | "kind_invalid" | "company_required" | "name_invalid" | "phone_invalid"
  | "email_invalid" | "date_invalid" | "date_required" | "message_required"
  | "consent_required" | "captcha_failed" | "rate_limited" | "origin_not_allowed"
  | "method_not_allowed" | "bad_json" | "server_error";

interface InquiryRow {
  kind: string;
  company: string | null;
  name: string;
  position: string | null;
  phone: string;
  email: string;
  country: string | null;
  industry: string | null;
  topic: string | null;
  quantity: string | null;
  region: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  consent_privacy: boolean;
  consent_at: string;
  lang: "ko" | "en";
  source_page: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string;
}

/**
 * 데이터베이스 접속용 비밀 키.
 * 새 방식 비밀 키(sb_secret_…)가 있으면 우선 씁니다. 기존 service_role 키는
 * Supabase 안내상 2026년 말까지만 동작하므로, 새 키가 있으면 그쪽이 안전합니다.
 */
function pickServiceKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const all = JSON.parse(raw) as Record<string, unknown>;
      const k = typeof all.default === "string"
        ? all.default
        : Object.values(all).find((v) => typeof v === "string");
      if (typeof k === "string" && k) return k;
    } catch {
      /* 형식이 다르면 아래 기존 키를 씁니다 */
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

/** 새 방식 키(sb_…)는 JWT가 아니므로 apikey 머리글에만 넣어야 합니다. */
function keyHeaders(key: string): Record<string, string> {
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function reply(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}
const ok = (origin: string | null) => reply({ ok: true }, 200, origin);
const fail = (error: ErrorCode, status: number, origin: string | null) =>
  reply({ ok: false, error }, status, origin);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** PostgREST 호출 — 비밀 키를 쓰므로 RLS를 우회합니다. 이 함수 안에서만 사용. */
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...keyHeaders(SERVICE_KEY),
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/* ---------- 문자열 정리 ----------
   글자 수는 데이터베이스(char_length)와 같은 기준(유니코드 문자 단위)으로 셉니다. */

/** 글자 수 */
function len(s: string): number {
  return [...s].length;
}

/** 글자 수 기준으로 자르기 (이모지 등이 반쪽으로 잘리지 않게) */
function cut(s: string, max: number): string {
  const chars = [...s];
  return chars.length > max ? chars.slice(0, max).join("").trimEnd() : s;
}

/* 제어문자 · 글자 방향을 뒤집는 보이지 않는 문자 (메일 제목 위장 방지) */
// deno-lint-ignore no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/g;
const BIDI = /[\u202a-\u202e\u2066-\u2069\u200e\u200f]/g;

function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

/** 한 줄 입력 — 줄바꿈·탭·제어문자는 공백으로, 연속 공백은 하나로 */
function line(v: unknown): string {
  return asText(v)
    .replace(BIDI, "")
    .replace(/[\r\n\t]/g, " ")
    .replace(CONTROL, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 여러 줄 입력(문의 내용) — 줄바꿈은 살리고 나머지 제어문자는 공백으로 */
function multiline(v: unknown): string {
  return asText(v)
    .replace(BIDI, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(CONTROL, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** 선택 입력 칸 — 비어 있으면 null, 길면 잘라서 저장 */
function optional(v: unknown, max: number): string | null {
  const s = cut(line(v), max);
  return s ? s : null;
}

/* ---------- 날짜 (한국 시간 기준) ---------- */

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 2026-02-30 같은 없는 날짜를 걸러냅니다 */
function isRealDate(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function kstStamp(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

/* ---------- 형식 검사 ---------- */

/* 브라우저의 type="email" 기준과 같되, 도메인에 점(.)이 반드시 있어야 합니다 */
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** 숫자·공백·+ - ( ) 만, 숫자는 8~20자리 (해외 번호 허용) */
function isPhone(s: string): boolean {
  if (!/^[0-9+\-()\s]+$/.test(s) || len(s) > 32) return false;
  const digits = s.replace(/\D/g, "").length;
  return digits >= 8 && digits <= 20;
}

function clientIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return xff || (req.headers.get("cf-connecting-ip") ?? "").trim() ||
    (req.headers.get("x-real-ip") ?? "").trim();
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // 캡차 미설정 상태에서도 접수는 되게 둡니다
  if (!token) return false;
  const form = new FormData();
  form.append("secret", TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const out = await r.json();
    return out?.success === true;
  } catch (err) {
    console.log(JSON.stringify({ captcha: "error", message: String(err).slice(0, 300) }));
    return false;
  }
}

/**
 * 알림 메일 발송.
 * 알림이 실패해도 접수는 성공으로 처리합니다. 다만 결과는 반드시 로그에 남깁니다.
 * 알림이 말없이 죽으면 운영 중에 아무도 모르기 때문입니다.
 * (Supabase 대시보드 > Edge Functions > submit-inquiry > Logs 에서 "notify" 로 확인)
 */
async function notify(row: InquiryRow, createdAt: string): Promise<void> {
  if (!RESEND_KEY || NOTIFY_TO.length === 0 || !NOTIFY_FROM) {
    console.log(JSON.stringify({
      notify: "skipped",
      reason: "missing_env",
      has_key: !!RESEND_KEY,
      has_to: NOTIFY_TO.length > 0,
      has_from: !!NOTIFY_FROM,
    }));
    return;
  }

  const label = KIND_LABEL[row.kind] ?? row.kind;
  const who = row.company ? `${row.company} / ${row.name}` : row.name;
  const v = (s: string | null) => (s ? s : "-");
  const when = row.preferred_date
    ? `${row.preferred_date}${row.preferred_time ? ` (${TIME_LABEL[row.preferred_time]})` : ""}`
    : row.preferred_time ? TIME_LABEL[row.preferred_time] : "-";

  const text = [
    `구분: ${label}`,
    `접수 시각: ${kstStamp(createdAt)} (한국시간)`,
    "",
    "[고객 정보]",
    `회사명: ${v(row.company)}`,
    `이름: ${row.name}`,
    `직함: ${v(row.position)}`,
    `연락처: ${row.phone}`,
    `이메일: ${row.email}`,
    `국가: ${v(row.country)}`,
    "",
    "[요청 내용]",
    `업종: ${v(row.industry)}`,
    `관심 제품: ${v(row.topic)}`,
    `예상 수량·시공 면적: ${v(row.quantity)}`,
    `지역: ${v(row.region)}`,
    `희망일: ${when}`,
    "",
    "[문의 내용]",
    row.message ?? "(없음)",
    "",
    "[접수 경로]",
    `언어: ${row.lang === "en" ? "English (영문 페이지)" : "한국어"}`,
    `접수 페이지: ${v(row.source_page)}`,
    `유입 경로: ${v(row.referrer)}`,
    `개인정보 수집·이용 동의: ${row.consent_privacy ? "동의" : "미동의"}`,
    "",
    "────────",
    `이 메일에 '답장'하시면 고객(${row.email})에게 바로 회신됩니다.`,
    `관리자 패널: ${ADMIN_URL}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_TO,
        reply_to: row.email,
        subject: cut(`[그린파스처] 새 ${label} — ${who}`, 180),
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.text();
    console.log(JSON.stringify({
      notify: res.ok ? "sent" : "failed",
      status: res.status,
      response: body.slice(0, 500),
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
    }));
  } catch (err) {
    console.log(JSON.stringify({ notify: "error", message: String(err).slice(0, 300) }));
  }
}

async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return fail("method_not_allowed", 405, origin);
  if (origin && !ORIGINS.includes(origin)) return fail("origin_not_allowed", 403, origin);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("missing_env: SUPABASE_URL / service key");
    return fail("server_error", 500, origin);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return fail("bad_json", 400, origin);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail("bad_json", 400, origin);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return fail("bad_json", 400, origin);
  }

  /* 1. 허니팟 — 사람 눈에 안 보이는 칸입니다. 채워져 있으면 봇입니다. */
  if (line(body.website)) return ok(origin); // 봇에게는 성공처럼 보이게, 저장은 하지 않습니다

  /* 2. 값 검사 */
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  if (!KINDS.has(kind)) return fail("kind_invalid", 400, origin);

  const company = optional(body.company, 100);
  if (kind === "partner" && !company) return fail("company_required", 400, origin);

  const name = line(body.name);
  if (len(name) < 1 || len(name) > 40) return fail("name_invalid", 400, origin);

  const phone = line(body.phone);
  if (!isPhone(phone)) return fail("phone_invalid", 400, origin);

  const email = line(body.email);
  if (!email || len(email) > 120 || !EMAIL_RE.test(email)) return fail("email_invalid", 400, origin);

  const preferredDate = line(body.preferred_date);
  if (preferredDate) {
    const today = kstToday();
    if (!isRealDate(preferredDate) || preferredDate < today || preferredDate > addDays(today, 365)) {
      return fail("date_invalid", 400, origin);
    }
  } else if (kind === "visit") {
    return fail("date_required", 400, origin);
  }

  const message = cut(multiline(body.message), 4000);
  if (kind === "contact" && !message) return fail("message_required", 400, origin);

  /* 3. 동의 — 동의 없이는 저장하지 않습니다 */
  if (body.consent_privacy !== true) return fail("consent_required", 400, origin);

  /* 4. 같은 곳에서 반복 접수하는지 확인 */
  const ip = clientIp(req);
  const ipHash = await sha256(IP_SALT + "|" + ip);

  if (ip) {
    /* 두 조회를 동시에 보내면 간헐적으로 인증이 틀어져 한쪽이 401을 받습니다.
       그러면 건수가 0으로 집계돼 제한이 걸리지 않으므로 순차로 확인합니다. */
    const counted = { headers: { Prefer: "count=exact", Range: "0-0" } };
    const count = (res: Response) => Number(res.headers.get("content-range")?.split("/")[1] ?? 0) || 0;

    const since10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const r10 = await db(`submit_rate_log?ip_hash=eq.${ipHash}&at=gte.${since10}&select=id`, counted);
    await r10.body?.cancel();
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const r24 = await db(`submit_rate_log?ip_hash=eq.${ipHash}&at=gte.${since24}&select=id`, counted);
    await r24.body?.cancel();

    if (!r10.ok || !r24.ok) {
      console.log(JSON.stringify({ ratelimit: "check_failed", s10: r10.status, s24: r24.status }));
    }
    if (count(r10) >= LIMIT_10MIN || count(r24) >= LIMIT_DAY) {
      return fail("rate_limited", 429, origin);
    }
  }

  /* 5. 캡차 */
  const passed = await verifyTurnstile(line(body.turnstile_token).slice(0, 4096), ip);
  if (!passed) return fail("captcha_failed", 400, origin);

  /* 6. 저장 */
  const now = new Date().toISOString();
  const preferredTime = line(body.preferred_time);
  const row: InquiryRow = {
    kind,
    company,
    name,
    position: optional(body.position, 40),
    phone,
    email,
    country: optional(body.country, 60),
    industry: optional(body.industry, 60),
    topic: optional(body.topic, 100),
    quantity: optional(body.quantity, 100),
    region: optional(body.region, 100),
    preferred_date: preferredDate || null,
    preferred_time: TIMES.has(preferredTime) ? preferredTime : null,
    message: message || null,
    consent_privacy: true,
    consent_at: now,
    lang: body.lang === "en" ? "en" : "ko",
    source_page: optional(body.source_page, 300),
    referrer: optional(body.referrer, 300),
    user_agent: optional(req.headers.get("user-agent"), 300),
    ip_hash: ipHash,
  };

  const res = await db("inquiries", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    console.error("insert failed", res.status, (await res.text()).slice(0, 500));
    return fail("server_error", 500, origin);
  }
  await res.body?.cancel();

  /* 7. 뒷정리 — 실패해도 접수는 이미 저장됐으므로 성공으로 응답합니다 */
  const logged = await db("submit_rate_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ip_hash: ipHash }),
  });
  if (!logged.ok) console.log(JSON.stringify({ ratelimit: "log_failed", status: logged.status }));
  await logged.body?.cancel();

  const cleaned = await db("rpc/cleanup_submit_rate_log", { method: "POST", body: "{}" });
  await cleaned.body?.cancel();

  await notify(row, now);

  return ok(origin);
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    console.error("unhandled", String(err).slice(0, 500));
    return fail("server_error", 500, req.headers.get("origin"));
  }
});
