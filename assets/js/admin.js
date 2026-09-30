/* ============================================================
   주식회사 그린파스처 · 온라인 문의 관리 화면 (admin.html)

   · 접근 권한은 이 화면이 아니라 데이터베이스(RLS)가 판정합니다.
     화면 코드를 고치거나 주소를 알아도, 관리자 명단(admin_users)에 없으면 아무것도 볼 수 없습니다.
   · 고객이 적어 보낸 글은 모두 "글자"로만 화면에 넣습니다(textContent).
     HTML 로 해석하지 않으므로, 악의적인 내용이 들어와도 화면에서 실행되지 않습니다.
   · 목록 조회·상세 열람·수정·내보내기·삭제는 모두 열람 기록(access_logs)에 남습니다.
     기록은 데이터베이스 함수 log_access() 가 로그인 계정 기준으로 직접 적습니다.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.GP_CONFIG || {};
  var URL_BASE = String(cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  var ANON = String(cfg.SUPABASE_ANON_KEY || "").trim();

  var PAGE_SIZE = 50;
  var EXPORT_MAX = 10000;   /* 한 번에 내려받는 최대 건수 */
  var FETCH_CHUNK = 1000;   /* Supabase 는 한 번에 최대 1,000건까지만 돌려줍니다 */

  var KIND = {
    contact: "문의",
    quote: "견적 요청",
    sample: "샘플 신청",
    visit: "시공 상담·방문",
    partner: "파트너 신청",
    catalog: "자료 요청"
  };
  var KIND_ORDER = ["contact", "quote", "sample", "visit", "partner", "catalog"];
  var STATUS = {
    new: "신규",
    in_progress: "상담중",
    quoted: "견적 발송",
    done: "완료",
    closed: "종료",
    spam: "스팸"
  };
  var STATUS_ORDER = ["new", "in_progress", "quoted", "done", "closed", "spam"];
  var TIME = { am: "오전", pm: "오후", any: "상관없음" };

  var $ = function (id) { return document.getElementById(id); };

  var sb = null;              /* Supabase 연결 */
  var me = null;              /* { id, email, name, role } */
  var names = {};             /* 관리자 user_id → 이름 (대표 계정만 전체 명단을 볼 수 있습니다) */
  var filters = { kind: "", status: "", q: "" };
  var page = 0, total = 0, rows = [], current = null, lastFocus = null;
  var rowsSeq = 0, countSeq = 0, entered = false;

  /* ============================================================
     작은 도구들
     ============================================================ */

  /** 요소 만들기. 글자는 항상 textContent 로 넣습니다. */
  function h(tag, props, children) {
    var e = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = String(v);
        else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2), v);
        else if (k === "href" || k === "value" || k === "type" || k === "disabled" || k === "selected") e[k] = v;
        else e.setAttribute(k, v === true ? "" : String(v));
      });
    }
    [].concat(children == null ? [] : children).forEach(function (c) {
      if (c == null || c === false || c === "") return;
      e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return e;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* 한국 시간(KST)으로 날짜 표시 — 담당자가 해외에서 접속해도 한국 시각으로 보입니다 */
  var KST_FMT = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  function kstParts(iso) {
    var out = {};
    KST_FMT.formatToParts(new Date(iso)).forEach(function (p) { out[p.type] = p.value; });
    return out;
  }
  /** 2026-10-01 14:03 */
  function fmtFull(iso) {
    if (!iso) return "";
    var p = kstParts(iso);
    return p.year + "-" + p.month + "-" + p.day + " " + p.hour + ":" + p.minute;
  }
  /** 목록용: 올해는 10.01 14:03, 지난해 이전은 2025.10.01 */
  function fmtShort(iso) {
    var p = kstParts(iso), now = kstParts(new Date().toISOString());
    return p.year === now.year ? p.month + "." + p.day + " " + p.hour + ":" + p.minute : p.year + "." + p.month + "." + p.day;
  }
  function kstToday() {
    var p = kstParts(new Date().toISOString());
    return p.year + p.month + p.day;
  }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function showMsg(msg) {
    var box = $("main-msg");
    box.textContent = msg;
    box.hidden = !msg;
  }

  function isAuthError(res) {
    var err = res && res.error;
    if (!err) return false;
    return res.status === 401 || err.code === "PGRST301" || err.code === "PGRST303" ||
      /jwt|token/i.test(String(err.message || ""));
  }

  /** 오류 처리 — 로그인이 만료됐으면 로그인 화면으로, 아니면 안내 문구 */
  function handleError(res, what) {
    console.error(what, res && res.error);
    if (isAuthError(res)) {
      signOut("로그인이 만료되었습니다. 다시 로그인해 주십시오.");
      return;
    }
    showMsg(what + " 잠시 후 다시 시도해 주십시오. 계속되면 인터넷 연결과 docs/SETUP.md 의 문제 해결 표를 확인해 주십시오.");
  }

  /** 열람 기록. 실패해도 화면 사용은 막지 않지만, 내보내기는 기록이 남아야만 진행합니다. */
  function log(action, targetId, detail) {
    if (!sb || !me) return Promise.resolve({ error: { message: "no_session" } });
    return sb.rpc("log_access", {
      p_action: action,
      p_target: targetId || null,
      p_detail: detail || null
    }).then(function (res) {
      if (res.error) console.warn("access log failed", action, res.error);
      return res;
    }, function (err) {
      console.warn("access log failed", action, err);
      return { error: err };
    });
  }

  function view(name) {
    $("view-setup").hidden = name !== "setup";
    $("view-login").hidden = name !== "login";
    $("view-main").hidden = name !== "main";
  }

  /* ============================================================
     시작 — 연결 설정 확인
     ============================================================ */
  if (!URL_BASE || !ANON) {
    view("setup");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    view("setup");
    $("setup-msg").textContent =
      "관리 화면에 필요한 Supabase 라이브러리(cdn.jsdelivr.net)를 불러오지 못했습니다. " +
      "인터넷 연결이나 회사 보안 프로그램의 차단 여부를 확인한 뒤 새로고침해 주십시오.";
    return;
  }

  /* 로그인 정보는 탭을 닫으면 사라지도록 sessionStorage 에 둡니다.
     (브라우저가 막아 두었으면 메모리에만 둡니다 — 새로고침하면 다시 로그인) */
  var store = (function () {
    try {
      window.sessionStorage.setItem("gp-admin-probe", "1");
      window.sessionStorage.removeItem("gp-admin-probe");
      return window.sessionStorage;
    } catch (e) {
      var mem = {};
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      };
    }
  })();

  sb = window.supabase.createClient(URL_BASE, ANON, {
    auth: {
      storage: store,
      storageKey: "gp-admin-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  /* ============================================================
     로그인 · 로그아웃
     ============================================================ */
  function loginMsg(msg) {
    var box = $("login-msg");
    box.textContent = msg || "";
    box.hidden = !msg;
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("lg-btn");
    var email = $("lg-email").value.trim();
    var pw = $("lg-pw").value;
    loginMsg("");
    if (!email || !pw) { loginMsg("이메일과 비밀번호를 입력해 주십시오."); return; }

    btn.disabled = true;
    btn.textContent = "확인 중…";
    sb.auth.signInWithPassword({ email: email, password: pw })
      .then(function (res) {
        if (res.error) {
          var m = String(res.error.message || "");
          if (res.error.status === 429 || /rate limit/i.test(m)) throw new Error("rate");
          if (/fetch|network/i.test(m)) throw new Error("network");
          throw new Error("bad_login");
        }
        return enter(true);
      })
      .catch(function (err) {
        var code = err && err.message;
        loginMsg(
          code === "rate" ? "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주십시오." :
          code === "network" ? "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주십시오." :
          code === "not_admin" ? "관리자 명단에 없는 계정입니다. 대표 관리자에게 등록을 요청해 주십시오." :
          code === "check_failed" ? "관리자 확인에 실패했습니다. 잠시 후 다시 시도해 주십시오." :
          "이메일 또는 비밀번호가 올바르지 않습니다."
        );
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "로그인";
      });
  });

  function signOut(msg) {
    entered = false;
    me = null;
    names = {};
    closeDetail();
    sb.auth.signOut().catch(function () {});
    $("lg-pw").value = "";
    view("login");
    loginMsg(msg || "");
    document.title = "온라인 문의 관리 | 그린파스처";
  }
  $("btn-out").addEventListener("click", function () { signOut(""); });

  sb.auth.onAuthStateChange(function (event) {
    if (event === "SIGNED_OUT" && entered) signOut("로그아웃되었습니다.");
  });

  /* ---------- 진입 (관리자 명단 확인) ---------- */
  function enter(fresh) {
    return sb.rpc("is_admin").then(function (res) {
      if (res.error) throw new Error("check_failed");
      if (res.data !== true) {
        return sb.auth.signOut().then(function () { throw new Error("not_admin"); });
      }
      return sb.auth.getUser();
    }).then(function (res) {
      var user = res && res.data && res.data.user;
      if (!user) throw new Error("check_failed");
      me = { id: user.id, email: user.email || "", name: "", role: "staff" };
      return sb.from("admin_users").select("user_id,email,name,role");
    }).then(function (res) {
      /* 직원 계정은 자기 줄만, 대표 계정은 전체 명단이 돌아옵니다 */
      (res.data || []).forEach(function (a) {
        names[a.user_id] = a.name || a.email;
        if (a.user_id === me.id) { me.name = a.name || ""; me.role = a.role; me.email = a.email || me.email; }
      });

      $("me-name").textContent = me.name || "관리자";
      if (me.role === "owner") $("me-name").appendChild(h("span", { class: "role", text: "대표" }));
      $("me-email").textContent = me.email;
      view("main");
      entered = true;
      if (fresh) log("login");
      buildFilters();
      refreshAll();
    });
  }

  /* ============================================================
     필터 · 탭
     ============================================================ */
  function buildFilters() {
    var sel = $("f-status");
    if (!sel.options.length) {
      sel.appendChild(h("option", { value: "" }, "상태 전체"));
      STATUS_ORDER.forEach(function (k) { sel.appendChild(h("option", { value: k }, STATUS[k])); });
    }
    sel.value = filters.status;
    $("f-q").value = filters.q;
    renderTabs({});
  }

  function renderTabs(counts) {
    var nav = $("kind-tabs");
    clear(nav);
    [""].concat(KIND_ORDER).forEach(function (k) {
      var n = counts[k || "_all"];
      var btn = h("button", {
        type: "button",
        class: "tab",
        "aria-pressed": filters.kind === k ? "true" : "false",
        onclick: function () {
          if (filters.kind === k) return;
          filters.kind = k;
          page = 0;
          renderTabs(lastCounts);
          loadRows();
        }
      }, [k ? KIND[k] : "전체", n ? h("span", { class: "badge", title: "신규 " + n + "건" }, String(n)) : null]);
      nav.appendChild(btn);
    });
  }

  var lastCounts = {};

  /* 구분별 '신규' 건수 — 탭 옆의 숫자 */
  function loadCounts() {
    var seq = ++countSeq;
    var jobs = [""].concat(KIND_ORDER).map(function (k) {
      var q = sb.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new");
      if (k) q = q.eq("kind", k);
      return q.then(function (res) { return res.error ? null : res.count || 0; });
    });
    return Promise.all(jobs).then(function (list) {
      if (seq !== countSeq) return;
      var counts = { _all: list[0] };
      KIND_ORDER.forEach(function (k, i) { counts[k] = list[i + 1]; });
      lastCounts = counts;
      renderTabs(counts);
      var n = counts._all || 0;
      $("new-total").hidden = !n;
      $("new-total").textContent = "확인 안 한 신규 " + n + "건";
      document.title = (n ? "(" + n + ") " : "") + "온라인 문의 관리 | 그린파스처";
    });
  }

  /* 검색어를 PostgREST 조건으로. 조건 구문에 쓰이는 글자( , ( ) * " \ )는 빼고 찾습니다. */
  function searchFilter(raw) {
    var t = String(raw || "").replace(/[,()*"\\]/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return "";
    var parts = ["name", "company", "email", "phone"].map(function (c) { return c + ".ilike.*" + t + "*"; });
    /* 01034972524 처럼 붙여서 쳐도 010-3497-2524 를 찾도록, 숫자 사이에 와일드카드를 둡니다 */
    var digits = t.replace(/\D/g, "");
    if (digits.length >= 3 && /^[\d\s()+-]+$/.test(t)) parts.push("phone.ilike.*" + digits.split("").join("*") + "*");
    return parts.join(",");
  }

  function applyFilters(q) {
    if (filters.kind) q = q.eq("kind", filters.kind);
    if (filters.status) q = q.eq("status", filters.status);
    var s = searchFilter(filters.q);
    if (s) q = q.or(s);
    return q;
  }

  function filterDetail() {
    return { kind: filters.kind || null, status: filters.status || null, q: filters.q || null };
  }

  /* 지금 걸려 있는 조건을 사람이 읽는 문장으로. 내보내기 확인창에 씁니다. */
  function filterSummary() {
    var s = [];
    if (filters.kind) s.push("구분: " + KIND[filters.kind]);
    if (filters.status) s.push("상태: " + STATUS[filters.status]);
    if (filters.q) s.push("검색어: \u201c" + filters.q + "\u201d");
    return s.length ? s.join("\n· ") : "조건 없음 (전체)";
  }

  var qTimer;
  $("f-q").addEventListener("input", function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      var v = $("f-q").value.trim();
      if (v === filters.q) return;
      filters.q = v;
      page = 0;
      loadRows();
    }, 350);
  });
  $("f-status").addEventListener("change", function () {
    filters.status = $("f-status").value;
    page = 0;
    loadRows();
  });
  $("btn-reset").addEventListener("click", function () {
    filters = { kind: "", status: "", q: "" };
    page = 0;
    buildFilters();
    renderTabs(lastCounts);
    loadRows();
  });
  $("btn-refresh").addEventListener("click", function () { refreshAll(); });
  $("pg-prev").addEventListener("click", function () { if (page > 0) { page--; loadRows(); } });
  $("pg-next").addEventListener("click", function () {
    if ((page + 1) * PAGE_SIZE < total) { page++; loadRows(); }
  });

  function refreshAll() {
    showMsg("");
    loadCounts();
    return loadRows();
  }

  /* ============================================================
     목록
     ============================================================ */
  function loadRows() {
    var seq = ++rowsSeq;
    var from = page * PAGE_SIZE;
    var q = applyFilters(sb.from("inquiries").select("*", { count: "exact" }))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    return q.then(function (res) {
      if (seq !== rowsSeq) return;   /* 더 최근 요청이 있으면 옛 응답은 버립니다 */
      if (res.error) { handleError(res, "목록을 불러오지 못했습니다."); return; }
      rows = res.data || [];
      total = res.count || 0;
      if (!rows.length && page > 0 && total > 0) { page = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1); loadRows(); return; }
      showMsg("");
      renderRows();
      log("list", null, { kind: filters.kind || null, status: filters.status || null, q: filters.q || null, page: page + 1, shown: rows.length, total: total });
    });
  }

  function kindChip(kind) { return h("span", { class: "kind k-" + kind }, KIND[kind] || kind); }
  function statusPill(status) { return h("span", { class: "pill s-" + status }, STATUS[status] || status); }

  function topicSummary(r) {
    var bits = [];
    if (r.topic) bits.push(r.topic);
    if (r.preferred_date) bits.push("희망일 " + r.preferred_date + (r.preferred_time ? " " + TIME[r.preferred_time] : ""));
    return bits.join(" · ");
  }

  function renderRows() {
    var tb = $("rows");
    clear(tb);
    $("empty").hidden = rows.length > 0;

    rows.forEach(function (r) {
      var tr = h("tr", { class: r.status === "new" ? "is-new" : "", tabindex: "0", "aria-label": (r.company ? r.company + " " : "") + r.name + " 상세 보기" }, [
        h("td", { class: "when", "data-label": "접수일시" }, fmtShort(r.created_at)),
        h("td", { class: "kd", "data-label": "구분" }, kindChip(r.kind)),
        h("td", { class: "co" + (r.company ? "" : " none") }, r.company || "–"),
        h("td", { class: "nm" }, [r.name, r.position ? h("span", { class: "pos" }, r.position) : null]),
        h("td", { class: "c-tel" }, r.phone),
        h("td", { class: "c-mail" }, r.email),
        h("td", { class: "c-topic" }, topicSummary(r) || "–"),
        h("td", { class: "st" }, statusPill(r.status))
      ]);
      tr.addEventListener("click", function () { openDetail(r, true); });
      tr.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(r, true); }
      });
      tb.appendChild(tr);
    });

    var from = page * PAGE_SIZE;
    $("pg-info").textContent = total === 0 ? "0건" :
      (from + 1) + "–" + Math.min(from + PAGE_SIZE, total) + " / 전체 " + total.toLocaleString("ko-KR") + "건";
    $("pg-prev").disabled = page === 0;
    $("pg-next").disabled = from + PAGE_SIZE >= total;
  }

  /* ============================================================
     상세
     ============================================================ */
  var EMAIL_OK = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/;

  function fact(label, value) {
    var empty = value == null || value === "";
    return [h("dt", null, label), h("dd", { class: empty ? "none" : "" }, empty ? "–" : value)];
  }

  function linkIfUrl(s) {
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return h("a", { href: s, target: "_blank", rel: "noopener noreferrer" }, s);
    return s;
  }

  function handlerName(id) {
    if (!id) return "";
    if (me && id === me.id) return (me.name || "본인") + " (본인)";
    return names[id] || "다른 관리자";
  }

  function openDetail(r, shouldLog) {
    current = r;
    if (!lastFocus || $("drawer").hidden) lastFocus = document.activeElement;

    var tags = $("d-tags");
    clear(tags);
    tags.appendChild(kindChip(r.kind));
    tags.appendChild(statusPill(r.status));
    $("d-title").textContent = r.company || r.name;
    $("d-sub").textContent = r.company ? r.name + (r.position ? " · " + r.position : "") : (r.position || "");

    var body = $("d-body");
    clear(body);

    /* 연락처 · 이메일 */
    var telDigits = String(r.phone || "").replace(/[^0-9+]/g, "");
    var phone = telDigits ? h("a", { href: "tel:" + telDigits }, r.phone) : r.phone;
    var emailNode = r.email;
    if (r.email && EMAIL_OK.test(r.email)) {
      var subject = "Re: [그린파스처] " + (KIND[r.kind] || "문의") + " 회신드립니다";
      emailNode = h("span", null, [
        h("a", { href: "mailto:" + r.email }, r.email),
        h("a", { class: "btn small inline-btn", href: "mailto:" + r.email + "?subject=" + encodeURIComponent(subject) }, "답장 쓰기")
      ]);
    }

    body.appendChild(h("h3", null, "고객 정보"));
    body.appendChild(h("dl", { class: "facts" }, [].concat(
      fact("회사명", r.company),
      fact("이름", r.name),
      fact("직함", r.position),
      fact("연락처", phone),
      fact("이메일", emailNode),
      fact("국가", r.country)
    )));

    body.appendChild(h("h3", null, "요청 내용"));
    body.appendChild(h("dl", { class: "facts" }, [].concat(
      fact("구분", KIND[r.kind] || r.kind),
      fact("업종", r.industry),
      fact("관심 제품", r.topic),
      fact("수량 · 면적", r.quantity),
      fact("지역", r.region),
      fact("희망일", r.preferred_date ? r.preferred_date + (r.preferred_time ? " · " + TIME[r.preferred_time] : "") :
        (r.preferred_time ? TIME[r.preferred_time] : ""))
    )));

    body.appendChild(h("h3", null, "문의 내용"));
    body.appendChild(h("div", { class: "note" + (r.message ? "" : " none") }, r.message || "(작성된 내용 없음)"));

    body.appendChild(h("h3", null, "접수 정보"));
    body.appendChild(h("dl", { class: "facts" }, [].concat(
      fact("접수일시", fmtFull(r.created_at) + " (한국시간)"),
      fact("접수번호", r.id),
      fact("언어", r.lang === "en" ? "English (영문 페이지)" : "한국어"),
      fact("개인정보 동의", r.consent_privacy ? "동의" + (r.consent_at ? " · " + fmtFull(r.consent_at) : "") : "미동의"),
      fact("접수 페이지", linkIfUrl(r.source_page)),
      fact("유입 경로", linkIfUrl(r.referrer)),
      fact("브라우저", r.user_agent)
    )));

    /* 처리 */
    var sel = h("select", { id: "d-status" });
    STATUS_ORDER.forEach(function (k) { sel.appendChild(h("option", { value: k }, STATUS[k])); });
    sel.value = r.status;
    var memo = h("textarea", { id: "d-memo", maxlength: "4000", placeholder: "통화 결과, 견적 금액·발송일, 다음 연락 일정 등을 적어 두십시오." });
    memo.value = r.admin_memo || "";
    var saveBtn = h("button", { class: "btn primary", type: "button", id: "d-save", onclick: saveDetail }, "저장");
    var meta = r.handled_at
      ? "마지막 처리: " + fmtFull(r.handled_at) + " · " + handlerName(r.handled_by)
      : "아직 처리 기록이 없습니다.";

    body.appendChild(h("section", { class: "handle" }, [
      h("h3", null, "처리"),
      h("label", { for: "d-status" }, "처리 상태"),
      sel,
      h("label", { for: "d-memo" }, "담당자 메모"),
      memo,
      h("div", { class: "row" }, [saveBtn, h("span", { class: "meta" }, meta)]),
      h("p", { class: "warn" }, "고객이 보낸 원문은 수정할 수 없습니다. 상태와 메모만 저장되며, 처리자와 처리 시각은 자동으로 기록됩니다.")
    ]));

    /* 삭제 — 되돌릴 수 없으므로 대표 계정에만 보여 드리고, 고객 이름을 직접 입력받습니다.
       (실제 허용 여부는 이 화면이 아니라 데이터베이스가 판정합니다) */
    if (me && me.role === "owner") {
      body.appendChild(h("section", { class: "danger-zone", id: "d-zone" }, [
        h("h3", null, "접수 삭제"),
        h("p", { class: "warn" }, "이 접수를 데이터베이스에서 완전히 지웁니다. 되돌릴 수 없습니다. " +
          "기록은 남겨야 하는 건(스팸·중복 등)이라면 삭제 대신 상태를 '스팸' 또는 '종료'로 바꾸십시오."),
        h("div", { class: "confirm", id: "d-confirm", hidden: true }, [
          h("label", { class: "warn", for: "d-del-name" }, "확인을 위해 고객 이름 \u201c" + r.name + "\u201d 을(를) 그대로 입력해 주십시오."),
          h("input", { id: "d-del-name", type: "text", autocomplete: "off" })
        ]),
        h("button", { class: "btn danger", type: "button", id: "d-delete", onclick: deleteDetail }, "삭제")
      ]));
    } else {
      body.appendChild(h("p", { class: "warn" }, "접수 삭제는 대표 계정에서만 가능합니다."));
    }

    $("drawer").hidden = false;
    $("veil").hidden = false;
    $("drawer").scrollTop = 0;
    $("d-close").focus();
    if (shouldLog) log("view", r.id);
  }

  function closeDetail() {
    if ($("drawer").hidden) return;
    $("drawer").hidden = true;
    $("veil").hidden = true;
    current = null;
    if (lastFocus && typeof lastFocus.focus === "function" && document.body.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }
  $("d-close").addEventListener("click", closeDetail);
  $("veil").addEventListener("click", closeDetail);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDetail();
  });

  function saveDetail() {
    if (!current) return;
    var btn = $("d-save");
    var before = current;
    var memoVal = $("d-memo").value.trim();
    var patch = {
      status: $("d-status").value,
      admin_memo: memoVal || null,
      /* 아래 두 값은 데이터베이스가 로그인 계정·현재 시각으로 다시 적습니다 */
      handled_by: me.id,
      handled_at: new Date().toISOString()
    };
    btn.disabled = true;
    btn.textContent = "저장 중…";

    sb.from("inquiries").update(patch).eq("id", before.id).select("*").then(function (res) {
      btn.disabled = false;
      btn.textContent = "저장";
      if (res.error || !res.data || !res.data.length) {
        if (isAuthError(res)) { handleError(res, "저장하지 못했습니다."); return; }
        console.error("save failed", res.error);
        alert("저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
        return;
      }
      var fresh = res.data[0];
      log("update", fresh.id, {
        status_from: before.status,
        status_to: fresh.status,
        memo_changed: (before.admin_memo || "") !== (fresh.admin_memo || "")
      });
      toast("저장했습니다.");
      /* 목록의 같은 줄도 바로 고칩니다 */
      rows = rows.map(function (x) { return x.id === fresh.id ? fresh : x; });
      renderRows();
      loadCounts();
      if (current && current.id === fresh.id) openDetail(fresh, false);
    });
  }

  /* 한 번에 지우지 않습니다. 먼저 이름 입력칸을 열고, 두 번째 눌렀을 때 지웁니다. */
  function deleteDetail() {
    if (!current) return;
    var btn = $("d-delete"), box = $("d-confirm"), input = $("d-del-name");

    if (box.hidden) {
      box.hidden = false;
      btn.textContent = "확인했습니다 · 완전히 삭제";
      input.focus();
      return;
    }
    if (input.value.trim() !== String(current.name).trim()) {
      alert("이름이 일치하지 않습니다.\n\n삭제하려는 접수의 고객 이름은 \u201c" + current.name + "\u201d 입니다.");
      input.focus();
      return;
    }
    var victim = current;
    var label = (victim.company ? victim.company + " / " : "") + victim.name;
    if (!confirm("\u201c" + label + "\u201d 의 " + (KIND[victim.kind] || "접수") + "을(를) 완전히 삭제합니다.\n\n되돌릴 수 없습니다. 진행할까요?")) return;

    btn.disabled = true;
    btn.textContent = "삭제 중…";

    /* select 를 붙이는 이유: 권한이 없으면 데이터베이스는 오류 없이 '0건 삭제'로 끝납니다.
       실제로 지워진 줄을 돌려받아야 성공 여부를 정확히 알 수 있습니다. */
    sb.from("inquiries").delete().eq("id", victim.id).select("id").then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        btn.disabled = false;
        btn.textContent = "확인했습니다 · 완전히 삭제";
        if (isAuthError(res)) { handleError(res, "삭제하지 못했습니다."); return; }
        alert(res.error ? "삭제하지 못했습니다. 잠시 후 다시 시도해 주십시오."
                        : "삭제되지 않았습니다.\n\n대표 계정만 삭제할 수 있습니다. 권한을 확인해 주십시오.");
        return;
      }
      /* 파기 기록. 지운 사실은 남기되, 지운 개인정보를 다시 적어 두지는 않습니다. */
      log("delete", victim.id, {
        name_masked: maskName(victim.name),
        company: victim.company ? maskName(victim.company) : null,
        kind: victim.kind,
        status: victim.status,
        created_at: victim.created_at
      });
      closeDetail();
      toast("삭제했습니다.");
      refreshAll();
    });
  }

  /* 홍길동 → 홍*동 · 김철 → 김* (파기 기록에 남길 최소한의 단서) */
  function maskName(name) {
    var s = Array.from(String(name || "").trim());
    if (s.length <= 1) return s.join("");
    if (s.length === 2) return s[0] + "*";
    return s[0] + new Array(s.length - 1).join("*") + s[s.length - 1];
  }

  /* ============================================================
     CSV 내보내기 (엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙입니다)
     목록과 똑같은 조건으로 내려받습니다. 내려받기 전에 조건과 건수를 먼저 보여 드립니다.
     ============================================================ */
  $("btn-csv").addEventListener("click", function () {
    var btn = $("btn-csv");
    btn.disabled = true;
    exportCsv().catch(function (err) {
      console.error("export failed", err);
      alert("내보내지 못했습니다. 잠시 후 다시 시도해 주십시오.");
    }).then(function () { btn.disabled = false; });
  });

  function exportCsv() {
    return applyFilters(sb.from("inquiries").select("id", { count: "exact", head: true })).then(function (res) {
      if (res.error) { handleError(res, "건수를 세지 못했습니다."); return; }
      var count = res.count || 0;
      if (count === 0) {
        alert("지금 조건에 해당하는 접수가 없습니다.\n\n· " + filterSummary());
        return;
      }
      var n = Math.min(count, EXPORT_MAX);
      var msg = "아래 조건으로 내려받습니다.\n\n· " + filterSummary() +
        "\n\n총 " + count.toLocaleString("ko-KR") + "건" +
        (count > EXPORT_MAX ? " 중 최근 " + EXPORT_MAX.toLocaleString("ko-KR") + "건" : "") +
        "\n\n고객 개인정보(이름·연락처·이메일)가 담긴 파일입니다. 보관과 폐기에 주의해 주십시오." +
        "\n내려받은 사실은 열람 기록에 남습니다.";
      if (!confirm(msg)) return;

      /* 기록이 먼저 남아야 내려받습니다 */
      var detail = filterDetail();
      detail.matched = count;
      detail.exported = n;
      return log("export", null, detail).then(function (lg) {
        if (lg && lg.error) {
          if (isAuthError(lg)) { handleError(lg, "내보내지 못했습니다."); return; }
          alert("열람 기록을 남기지 못해 내보내기를 중단했습니다. 잠시 후 다시 시도해 주십시오.");
          return;
        }
        return fetchAll(n).then(function (list) { download(list); });
      });
    });
  }

  /* 1,000건씩 나누어 받습니다. 받는 도중 새 접수가 들어와 같은 줄이 두 번 오면 한 번만 씁니다. */
  function fetchAll(n) {
    var out = [], seen = {};
    function next(from) {
      if (from >= n) return Promise.resolve(out);
      var to = Math.min(from + FETCH_CHUNK, n) - 1;
      return applyFilters(sb.from("inquiries").select("*"))
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
        .then(function (res) {
          if (res.error) throw res.error;
          var got = res.data || [];
          got.forEach(function (r) { if (!seen[r.id]) { seen[r.id] = true; out.push(r); } });
          if (got.length < to - from + 1) return out;
          return next(to + 1);
        });
    }
    return next(0);
  }

  /* 엑셀이 수식으로 해석하지 않도록 = + - @ 로 시작하는 칸 앞에 ' 를 붙입니다 (CSV 수식 주입 방지) */
  function cell(v, plain) {
    var s = v == null ? "" : String(v);
    if (!plain && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return "\"" + s.replace(/"/g, "\"\"") + "\"";
  }

  function download(list) {
    var head = [
      "접수번호", "접수일시(한국시간)", "구분", "상태", "회사명", "이름", "직함", "연락처", "이메일", "국가",
      "업종", "관심 제품", "예상 수량·시공 면적", "지역", "희망일", "희망 시간대", "문의 내용",
      "담당자 메모", "마지막 처리 시각", "언어", "개인정보 동의", "동의 시각", "접수 페이지", "유입 경로"
    ];
    var lines = [head.map(function (x) { return cell(x); }).join(",")];
    list.forEach(function (r) {
      lines.push([
        cell(r.id), cell(fmtFull(r.created_at)), cell(KIND[r.kind] || r.kind), cell(STATUS[r.status] || r.status),
        cell(r.company), cell(r.name), cell(r.position),
        cell(r.phone, true),   /* 연락처는 숫자·+ - ( ) 만 허용되므로 그대로 둡니다 (+82 가 '+82 로 바뀌지 않게) */
        cell(r.email), cell(r.country), cell(r.industry), cell(r.topic), cell(r.quantity), cell(r.region),
        cell(r.preferred_date), cell(r.preferred_time ? TIME[r.preferred_time] : ""), cell(r.message),
        cell(r.admin_memo), cell(fmtFull(r.handled_at)), cell(r.lang === "en" ? "영문" : "국문"),
        cell(r.consent_privacy ? "동의" : "미동의"), cell(fmtFull(r.consent_at)), cell(r.source_page), cell(r.referrer)
      ].join(","));
    });

    var BOM = String.fromCharCode(0xfeff);
    var blob = new Blob([BOM + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    var tag = [filters.kind ? KIND[filters.kind] : "", filters.status ? STATUS[filters.status] : ""]
      .filter(Boolean).join("_").replace(/[\s·]+/g, "");
    a.href = url;
    a.download = "그린파스처_온라인문의_" + (tag ? tag + "_" : "") + kstToday() + "_" + list.length + "건.csv";
    /* 문서에 붙였다 떼어야 정한 파일 이름이 적용됩니다. 주소 회수는 한 박자 뒤에 합니다. */
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { window.URL.revokeObjectURL(url); }, 1500);
    toast(list.length.toLocaleString("ko-KR") + "건을 내려받았습니다.");
  }

  /* ============================================================
     첫 화면 — 로그인돼 있으면 바로 목록으로
     ============================================================ */
  sb.auth.getSession().then(function (res) {
    var session = res && res.data && res.data.session;
    if (!session) { view("login"); return; }
    return enter(false).catch(function (err) {
      view("login");
      loginMsg(err && err.message === "not_admin" ? "관리자 명단에 없는 계정입니다. 대표 관리자에게 등록을 요청해 주십시오." : "");
    });
  }, function () { view("login"); });
})();
