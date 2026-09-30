# 온라인 문의 데이터베이스 · 관리자 패널 설치 안내

주식회사 그린파스처(V-ZERO) 홈페이지의 **문의하기 · 견적 요청 · 샘플 신청 · 시공 상담/현장 방문 예약 · 파트너/대리점 신청 · 카탈로그/시험성적서 요청** 양식을
데이터베이스에 저장하고, `admin.html` 에서 확인·처리할 수 있게 하는 설치 안내입니다.

이 문서대로 순서대로 따라 하시면 됩니다. 전부 합쳐 40분 정도 걸립니다.
(도메인 메일 인증은 DNS 반영 시간 때문에 하루 정도 걸릴 수 있습니다.)

## 현재 상태 (2026-09-30 기준)

**코드만 준비된 상태입니다. 아직 아무것도 연결하지 않았습니다.**

| | 항목 | 비고 |
|---|---|---|
| ⬜ | Supabase 프로젝트 생성 | 1번 |
| ⬜ | 표 · 권한 · RLS 적용 | 2번 |
| ⬜ | 관리자 계정 · 회원가입 차단 | 3번 |
| ⬜ | 접수 함수 배포 · 환경변수 | 4번 |
| ⬜ | `assets/js/config.js` 채우기 | 5번 — 채우기 전까지 양식은 메일 앱을 여는 방식으로 동작 |
| ⬜ | Resend 도메인 인증 (`greenpasture.co.kr`) | 6번 |
| ⬜ | keepalive 시크릿 등록 | 7번 — 등록 전에는 아무것도 하지 않고 정상 종료 |
| ⬜ | 전 구간 점검 | 8번 |

연결 전에는 `admin.html` 에 **"아직 연결되지 않았습니다 — docs/SETUP.md 참고"** 가 표시됩니다. 정상입니다.

---

## 0. 전체 구조

```
  방문자 ──▶ 홈페이지 양식 ──▶ 접수 함수 ──────────▶ 데이터베이스
            (6가지 신청)      (submit-inquiry)       (inquiries)
                              · 보낸 곳 확인(CORS)        │
                              · 봇 차단(허니팟·캡차)      │
                              · 반복 접수 차단            │
                              · 값·동의 확인              │
                                   │                      │
                                   ▼                      │
                              알림 메일(Resend)            │
                              → 담당자 메일함              │
                                (답장하면 고객에게 바로)    │
                                                          ▼
  담당자 ──▶ 관리자 패널 (admin.html) ── 로그인한 관리자만 조회 ─┘
             · 목록 · 검색 · 상태 변경 · 메모 · CSV 내보내기
             · 모든 조회·수정·내보내기·삭제는 열람 기록(access_logs)에 남음
```

**양식은 데이터베이스에 직접 접근하지 못합니다.** 반드시 접수 함수를 거칩니다.
관리자 패널도 화면에서 권한을 판정하지 않고, **데이터베이스가 직접 판정**합니다.
즉 주소를 알아도, 화면 코드를 고쳐도, 관리자 명단에 없으면 접수 내역은 볼 수 없습니다.

| 파일 | 역할 |
|---|---|
| `supabase/migrations/20261001000001_inquiries.sql` | 표 · 권한 · 접근 규칙(RLS) |
| `supabase/functions/submit-inquiry/index.ts` | 접수 함수 |
| `admin.html` · `assets/js/admin.js` · `assets/css/admin.css` | 관리자 패널 |
| `assets/js/config.js` | 공개 연결 설정 (주소 · 공개 키) |
| `.github/workflows/keepalive.yml` | 무료 프로젝트 자동 정지 방지 |

---

## 1. Supabase 무료 조직과 프로젝트 만들기

1. https://supabase.com 접속 → 로그인
2. 왼쪽 위 조직 이름 클릭 → **New organization**
3. 이름은 `greenpasture` 정도로, 요금제는 반드시 **Free** 선택
4. 그 조직 안에서 **New project**
   - Name: `greenpasture`
   - Database Password: 자동 생성된 것을 쓰시고 **안전한 곳에 보관**하십시오
   - Region: **Northeast Asia (Seoul)** — 반드시 서울로 하십시오
5. 생성까지 2~3분 걸립니다

> ⚠ **기존 조직(ESC·intoedu 등 유료 요금제가 걸린 조직)에 만들면 월 약 $10이 추가됩니다.**
> Supabase 는 요금제를 조직 단위로 매기며, 한 조직 안에 무료·유료 프로젝트를 섞을 수 없습니다.
> 유료 조직에는 프로젝트 1개분의 컴퓨트 크레딧($10)만 포함되고, 추가 프로젝트는 개당 월 약 $10부터 붙습니다.
> **새 무료 조직이어야 $0입니다.**

### 무료 요금제에서 꼭 알아야 할 것 (2026-09-30 Supabase 공식 문서로 확인)

| 항목 | 내용 | 출처 |
|---|---|---|
| 무료 프로젝트 수 | **계정당 활성 무료 프로젝트 2개까지.** 본인이 Owner·Admin 인 모든 조직을 합쳐서 셉니다. 일시정지된 프로젝트는 세지 않습니다. | Billing FAQ "How many free projects can I have?", About billing on Supabase "Free Plan" |
| 조직 멤버 주의 | 조직 안에 Owner·Admin 역할의 다른 멤버가 무료 한도를 이미 다 썼으면, 그 조직에는 무료 프로젝트를 더 만들 수 없습니다. 이때는 새 무료 조직을 만들거나 그 멤버의 역할을 바꾸라고 안내돼 있습니다. | Billing FAQ |
| 자동 일시정지 | 무료 프로젝트는 **7일 동안 사용이 적으면 자동으로 멈춥니다.** 멈추기 약 1주일 전에 경고 메일, 멈춘 뒤 확인 메일이 옵니다. 공식 문서는 "보통 매일 몇 번의 요청이 있으면 정지되지 않는다"고 설명합니다. → 7번 keepalive | Project Pausing |
| 멈춘 동안 | 요청에 **540** 응답을 돌려주며 접수가 되지 않습니다. 대시보드에서 **Resume project** 로 되살립니다. **멈춘 뒤 90일이 지나면 대시보드에서 되살릴 수 없습니다.** | HTTP status codes, Project Pausing |

- 출처 문서: `supabase.com/docs/guides/platform/billing-faq`, `…/platform/billing-on-supabase`, `…/platform/free-project-pausing`, `…/troubleshooting/http-status-codes`
- 명동미래셀 프로젝트를 같은 계정으로 운영 중이라면 그것이 무료 한도 2개 중 1개를 쓰고 있습니다.
  무료 프로젝트를 만들 수 없다고 나오면, 쓰지 않는 무료 프로젝트를 정지하거나 **그린파스처 명의의 별도 Supabase 계정**으로 만드십시오.
  (소유권 측면에서도 고객사 명의 계정이 바람직합니다. 대행사 계정을 초대할 때는 Owner·Admin 대신 **Developer** 역할로 초대하면 위 한도 계산에 들어가지 않습니다.)

---

## 2. 표(테이블) 만들기

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 저장소의 `supabase/migrations/20261001000001_inquiries.sql` 내용을 **전부 복사해 붙여넣기**
3. **Run** 클릭 → `Success` 가 뜨면 완료
   (여러 번 실행해도 안전합니다. 이미 있는 것은 건너뛰고 권한·규칙만 다시 맞춥니다)

만들어지는 것:

| 표 · 함수 | 내용 |
|---|---|
| `inquiries` | 접수 내역 본체 (구분 · 회사명 · 이름 · 연락처 · 이메일 · 요청 내용 · 처리 상태 · 메모 · 동의 이력) |
| `admin_users` | 관리자 명단 (여기 없으면 로그인해도 못 봅니다) |
| `access_logs` | 누가 언제 무엇을 조회·열람·수정·내보내기·삭제했는지 |
| `submit_rate_log` | 반복 접수 차단용 기록 (이틀 지나면 자동 삭제) |
| `is_admin()` · `is_owner()` | 관리자 · 대표 판정 |
| `log_access()` | 관리자 패널이 열람 기록을 남길 때 쓰는 함수 (계정 정보는 데이터베이스가 직접 채움) |
| `purge_expired_inquiries()` | 보관기간이 지난 접수 파기 (부록 참고) |

이 파일이 정하는 접근 규칙:

- 홈페이지 방문자(`anon`)는 **어떤 표에도 접근할 수 없습니다.**
- 관리자는 접수 내역을 볼 수 있지만, **고객이 보낸 원문은 수정할 수 없고 처리 상태와 메모만** 바꿀 수 있습니다.
  처리자와 처리 시각은 화면이 보낸 값이 아니라 **로그인 계정과 현재 시각으로 데이터베이스가 기록**합니다.
- **삭제와 열람 기록 조회는 대표(owner) 계정만** 가능합니다.

---

## 3. 관리자 계정 만들기

### 3-1. 로그인 계정 생성
1. 왼쪽 메뉴 **Authentication** → **Users** → **Add user** → **Create new user**
2. 이메일과 비밀번호 입력, **Auto Confirm User 를 켜십시오**
3. 담당자가 여러 명이면 사람 수만큼 만드십시오 (**계정 공유는 하지 마십시오** — 열람 기록이 사람별로 남아야 합니다)

### 3-2. 관리자 명단에 등록
**SQL Editor** 에서 아래를 실행합니다. 이메일과 이름만 바꾸십시오.

```sql
insert into public.admin_users (user_id, email, name, role)
select id, email, '대표이사', 'owner'
  from auth.users where email = 'ceo@greenpasture.co.kr'
on conflict (user_id) do update set role = excluded.role, name = excluded.name;
```

직원 계정은 `'owner'` 대신 `'staff'` 로 넣으십시오.

| 역할 | 할 수 있는 것 |
|---|---|
| `owner` (대표) | 조회 · 상태/메모 저장 · CSV 내보내기 · **삭제** · **열람 기록 조회** |
| `staff` (직원) | 조회 · 상태/메모 저장 · CSV 내보내기 |

### 3-3. 아무나 가입하지 못하게 막기
**Authentication** → **Sign In / Providers** 에서 **Allow new users to sign up** 을 **끄십시오.**
(이것을 빠뜨리면 누구나 계정을 만들 수 있습니다. 계정을 만들어도 `admin_users` 에 없으면 접수 내역은 못 보지만, 그래도 반드시 끄십시오.)

---

## 4. 접수 함수 배포하기

대시보드에서 붙여넣거나, Supabase CLI 를 쓸 수 있습니다. 둘 중 하나만 하시면 됩니다.

### 대시보드에서 하는 법 (간단)
1. 왼쪽 메뉴 **Edge Functions** → **Deploy a new function** → **Via Editor**
2. 이름을 정확히 **`submit-inquiry`** 로 입력 (다르면 홈페이지가 찾지 못합니다)
3. 기본으로 들어 있는 예제 코드를 지우고, `supabase/functions/submit-inquiry/index.ts` 내용을 **전부** 붙여넣기
4. **Deploy function**
5. 배포된 함수의 상세 화면(**Details** / 설정)에서 **JWT 검증(Enforce JWT Verification · Verify JWT) 을 끄고** 저장하십시오.

### CLI 로 하는 법
```bash
supabase login
supabase link --project-ref <프로젝트 ref>      # 주소 https://<ref>.supabase.co 의 <ref> 부분
supabase functions deploy submit-inquiry --no-verify-jwt
```

> **왜 JWT 검증을 끄는가 (`--no-verify-jwt`)**
> 홈페이지 방문자는 로그인하지 않으므로 사용자 토큰이 없습니다. 양식은 공개 키만 보냅니다.
> - 새 방식 공개 키(`sb_publishable_…`)는 JWT 가 아니어서, 검증을 켜 두면 함수에 닿기도 전에 **401 Invalid JWT** 로 막힙니다.
>   (Supabase 문서 "Authorization headers", "Migrating to publishable and secret API keys" 에서 이 경우 `verify_jwt = false` 로 두고 함수 안에서 검사하라고 안내합니다.)
> - 예전 anon 키(`eyJ…`)는 검증을 통과하긴 하지만, 누구나 볼 수 있는 공개 키라 막아 주는 효과가 없습니다.
>
> 대신 함수 안에서 **보낸 곳(CORS) · 허니팟 · 캡차 · 반복 접수 · 값 · 동의**를 직접 검사합니다.
> 명동미래셀 프로젝트도 같은 방식으로 운영 중입니다.

### 함수 환경변수 등록
**Edge Functions** → **Secrets** 에서 추가합니다. (CLI: `supabase secrets set 이름=값`)

| 이름 | 필수 | 값 |
|---|---|---|
| `IP_SALT` | 권장 | 아무 긴 임의 문자열 (예: 40자 이상 무작위). 한 번 정하면 바꾸지 마십시오. 바꾸면 반복 접수 차단 기록이 초기화됩니다 |
| `ALLOWED_ORIGINS` | 선택 | 비워 두면 아래 기본 목록을 씁니다. 넣을 때는 쉼표로 구분하고, **목록 전체를 다시 적어야** 합니다 (기본 목록에 더해지는 것이 아니라 대체됩니다) |
| `RESEND_API_KEY` | 선택 | 6번 참고. 없으면 알림 메일 없이 저장만 됩니다 |
| `NOTIFY_TO` | 선택 | 알림 받을 주소. 여러 명이면 쉼표로 구분. 예) `ceo@greenpasture.co.kr` |
| `NOTIFY_FROM` | 선택 | 발신 주소. 6번 참고. 예) `그린파스처 <no-reply@greenpasture.co.kr>` |
| `TURNSTILE_SECRET_KEY` | 선택 | 5-1 참고. 없으면 캡차 없이 동작합니다 |
| `ADMIN_URL` | 선택 | 알림 메일에 넣을 관리자 패널 주소. 비우면 `https://www.greenpasture.co.kr/admin.html`. 도메인 연결 전이면 `https://intoedu.github.io/greenpasture/admin.html` |

`ALLOWED_ORIGINS` 기본 목록 (홈페이지가 실제로 열리는 주소들):

```
https://www.greenpasture.co.kr,https://greenpasture.co.kr,https://www.vzero.co.kr,https://vzero.co.kr,https://intoedu.github.io,http://localhost:8080,http://127.0.0.1:8080
```

- 현재 저장소(`intoedu/greenpasture`)가 GitHub Pages 로 발행되면 주소는 `https://intoedu.github.io/greenpasture/` 입니다. 목록에는 경로 없이 `https://intoedu.github.io` 만 적습니다.
- 도메인을 새로 연결하면 그 주소를 반드시 추가하십시오. **주소 끝에 `/` 를 붙이지 말고, `https://` 까지 정확히** 적으십시오.
- `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_SECRET_KEYS` 는 Supabase 가 자동으로 넣어 주므로 **직접 등록하지 않습니다.**
  (함수는 새 방식 비밀 키가 있으면 그것을, 없으면 예전 service_role 키를 씁니다.)

---

## 5. 홈페이지에 주소 연결하기 (`assets/js/config.js`)

Supabase 대시보드에서 두 값을 복사해 `assets/js/config.js` 에 넣습니다.

- **Project URL** — 프로젝트 첫 화면의 **Connect** 버튼 또는 **Project Settings** 에서 확인 (`https://xxxxxxxx.supabase.co`)
- **공개 키** — **Project Settings** → **API Keys** → **Publishable key** (`sb_publishable_…`)

```js
window.GP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_....",
  SUBMIT_FUNCTION: "submit-inquiry",   // 바꾸지 마십시오
  TURNSTILE_SITE_KEY: "",               // 5-1 (선택)
  ...
};
```

> 이 두 값은 **공개돼도 되는 값**입니다. 브라우저가 어차피 보게 되며,
> 접근 권한은 이 키가 아니라 데이터베이스 규칙(RLS)이 결정합니다.
> **`service_role` 키나 `sb_secret_…` 비밀 키는 절대 여기 넣지 마십시오.** 그 키는 모든 제한을 무시합니다.

> **공개 키는 `sb_publishable_…` 를 권장합니다.** Supabase 문서에 따르면 예전 방식의 `anon` · `service_role` 키는
> **2026년 말까지만 동작**합니다(“Migrating to publishable and secret API keys”, 2026-09-30 확인).
> 예전 `anon` 키(`eyJ…`)로 연결했다면 연말 전에 `sb_publishable_…` 로 바꾸고, 7번 keepalive 시크릿도 같이 바꾸십시오.

값을 넣고 저장소에 올리면(GitHub Pages 자동 배포), 양식이 메일 앱 대신 데이터베이스로 접수되고 `admin.html` 이 로그인 화면으로 바뀝니다.

### 5-1. 스팸 차단 (Cloudflare Turnstile · 무료 · 선택)

없어도 접수는 됩니다(허니팟과 반복 접수 차단은 항상 켜져 있습니다). 광고 봇이 들어오기 시작하면 켜십시오.

1. https://dash.cloudflare.com 무료 가입
2. 좌측 **Turnstile** → **Add widget**
   - Domain: `greenpasture.co.kr`, `vzero.co.kr`, `intoedu.github.io` (실제 쓰는 주소 모두)
   - Widget Mode: **Managed**
3. **Site Key** → `assets/js/config.js` 의 `TURNSTILE_SITE_KEY` 에
4. **Secret Key** → Supabase Edge Functions **Secrets** 의 `TURNSTILE_SECRET_KEY` 에

> 순서 주의: **사이트 키를 먼저 올려 홈페이지에 캡차가 뜨는 것을 확인한 뒤** 비밀 키를 등록하십시오.
> 비밀 키만 먼저 넣으면 모든 접수가 `captcha_failed` 로 막힙니다.

---

## 6. 새 접수 알림 메일 (Resend)

### 6-1. 가입과 API 키
1. https://resend.com 가입
2. **API Keys** → **Create API Key** (권한은 Sending access 로 충분)
3. Supabase Secrets 에 `RESEND_API_KEY`, `NOTIFY_TO`, `NOTIFY_FROM` 등록

알림 메일 모양:

```
제목: [그린파스처] 새 견적 요청 — 주식회사 ○○ / 홍길동
본문: 구분 · 접수 시각 · 고객 정보 · 요청 내용 · 문의 내용 · 접수 경로 (모든 항목)
```

**답장 주소(Reply-To)가 고객 이메일로 설정돼 있어, 알림 메일에서 '답장'을 누르면 고객에게 바로 회신됩니다.**

### 6-2. 도메인 인증 전 — 무엇이 되고 무엇이 안 되는가

도메인을 인증하기 전에는 Resend 의 테스트 발신 주소 `onboarding@resend.dev` 만 쓸 수 있고,
**받는 사람은 Resend 에 가입한 본인 이메일 한 곳뿐입니다.** 다른 주소로 보내면 Resend 가 403 오류
("You can only send testing emails to your own email address")로 거부합니다.

그래서 인증 전 임시 설정은 이렇게 하십시오.

| 이름 | 인증 전 값 |
|---|---|
| `NOTIFY_FROM` | `그린파스처 <onboarding@resend.dev>` |
| `NOTIFY_TO` | Resend 가입에 쓴 이메일 **한 곳만** |

- 알림 발송이 실패해도 **접수 자체는 정상 저장됩니다.** 실패 사유는 **Edge Functions → submit-inquiry → Logs** 에서 `notify` 로 검색하면 보입니다
  (`skipped` = 환경변수 누락, `failed` + `403` = 도메인 미인증 상태에서 다른 주소로 발송).
- 명동미래셀 운영 경험상 `onboarding@resend.dev` 발신 메일은 **Gmail 스팸함으로 가기 쉽습니다.** 인증 전에는 스팸함도 확인하십시오.

### 6-3. 도메인 인증 (`greenpasture.co.kr`) — 근본 해결
1. Resend → **Domains** → **Add Domain** → `greenpasture.co.kr`
2. 화면에 나오는 **DNS 레코드(SPF · DKIM 등의 TXT/MX)를 도메인을 관리하는 곳(도메인 등록업체 또는 DNS 호스팅 — 가비아·카페24·후이즈 등)의 DNS 관리 화면에 그대로 추가**합니다.
   - 레코드 이름(호스트)과 값을 **한 글자도 바꾸지 말고** 복사하십시오. 업체에 따라 이름 칸에 `greenpasture.co.kr` 를 뺀 앞부분만 적어야 합니다.
   - ⚠ **기존 회사 메일(@greenpasture.co.kr 수신)용 MX 레코드는 지우거나 고치지 마십시오.** Resend 가 요구하는 레코드는 추가만 하면 됩니다.
3. Resend 화면에서 **Verify** — DNS 반영에 몇 분에서 길게는 하루 이상 걸릴 수 있습니다
4. 인증되면 Supabase Secrets 를 바꿉니다

| 이름 | 인증 후 값 |
|---|---|
| `NOTIFY_FROM` | `그린파스처 <no-reply@greenpasture.co.kr>` |
| `NOTIFY_TO` | 받을 주소 여러 개 가능. 예) `ceo@greenpasture.co.kr,sales@greenpasture.co.kr` |

5. 메일함에 `no-reply@greenpasture.co.kr` 필터(스팸 아님 · 중요 표시)를 만들어 두시면 놓치지 않습니다.

> Resend 무료 요금제 한도는 **하루 100통, 월 3,000통**으로 안내돼 있습니다
> (Resend 문서 "Account quotas and limits" 검색 결과로 확인. 이 작업 환경에서는 resend.com 에 직접 접속할 수 없어 원문 페이지는 열어 보지 못했습니다).
> 접수 알림 용도로는 충분합니다.

---

## 7. 프로젝트가 멈추지 않게 하기 (keepalive)

무료 요금제는 **7일 동안 사용이 적으면 프로젝트가 자동으로 정지**됩니다(1번 표 참고).
정지된 상태에서는 고객이 신청을 눌러도 접수가 실패합니다.

이 저장소에 `.github/workflows/keepalive.yml` 이 들어 있습니다. **3일마다 자동으로 데이터베이스를 깨웁니다.**

**저장소 Settings → Secrets and variables → Actions → New repository secret** 에서 등록하십시오.

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | 5번의 Project URL |
| `SUPABASE_ANON_KEY` | 5번의 공개 키 (`sb_publishable_…`) |

등록 후 **Actions 탭 → Supabase keepalive → Run workflow** 로 한 번 눌러 초록색(성공)인지 확인하십시오.

- **시크릿을 등록하기 전에는** 이 작업이 "Supabase 미연결" 안내만 남기고 **성공으로 끝납니다.** 실패 알림 메일이 오지 않도록 일부러 그렇게 했습니다.
- 등록 후 실패(빨간색)로 끝나면 프로젝트가 멈췄거나 주소·키가 틀린 것입니다. 9번 표를 보십시오.
- Supabase 문서는 "보통 **매일 몇 번**의 요청이 있으면 정지되지 않는다"고 설명합니다. 3일 간격인데도 **일시정지 경고 메일**을 받으면
  `keepalive.yml` 의 `cron: "17 3 */3 * *"` 를 `cron: "17 3 * * *"`(매일)로 바꾸십시오.
- ⚠ GitHub 은 **공개 저장소에 60일 동안 아무 활동(커밋 등)이 없으면 예약 작업을 자동으로 끕니다**(GitHub 문서 "Disabling and enabling a workflow").
  꺼지기 전에 GitHub 이 메일로 알려 줍니다. 그 메일을 받으면 **Actions 탭 → Supabase keepalive → Enable workflow** 를 누르십시오.

---

## 8. 점검 (공개 전 반드시)

실제 홈페이지(또는 GitHub Pages 주소)에서 확인하십시오.

**접수**
- [ ] 6가지 양식(문의 · 견적 · 샘플 · 방문 예약 · 파트너 · 자료 요청)을 각각 1건씩 접수해 본다 → 메일 앱이 열리지 않고 접수 완료 안내가 뜬다
- [ ] Supabase **Table Editor → inquiries** 에 6건이 들어와 있다
- [ ] 방문 예약에서 **희망일을 비우면** 막힌다 (`date_required`), 파트너 신청에서 **회사명을 비우면** 막힌다 (`company_required`)
- [ ] **개인정보 동의를 체크하지 않으면** 접수되지 않는다
- [ ] 같은 네트워크에서 **10분 안에 4번째** 접수하면 막힌다 (`rate_limited`)

**알림 메일**
- [ ] 알림 메일이 **받은편지함**에 온다 (스팸함 아님), 제목이 `[그린파스처] 새 ○○ — 회사명 / 이름` 형식이다
- [ ] 알림 메일에서 **답장**을 누르면 받는 사람이 **고객 이메일**로 채워진다

**관리자 패널 (`admin.html`)**
- [ ] 로그인하면 목록이 최신순으로 보이고, 구분 탭 옆에 **신규 건수**가 보인다
- [ ] 상태를 바꾸고 메모를 저장하면 반영되고, "마지막 처리: 시각 · 이름" 이 보인다
- [ ] **CSV 내보내기** 파일을 엑셀에서 더블클릭으로 열었을 때 한글이 깨지지 않는다
- [ ] 직원(staff) 계정에는 **삭제 버튼이 없고**, 대표(owner) 계정에서는 삭제가 된다
- [ ] 관리자 명단에 없는 계정으로 로그인하면 **"관리자 명단에 없는 계정입니다"** 가 뜨고 아무것도 보이지 않는다
- [ ] 로그아웃 후에는 목록이 보이지 않는다
- [ ] 대표 계정으로 SQL Editor 에서 열람 기록을 조회하면(부록) login · list · view · update · export 기록이 담당자 이메일과 함께 남아 있다

**운영**
- [ ] Actions 탭의 **Supabase keepalive** 가 초록색이다
- [ ] 개인정보처리방침의 **보유기간**과 부록의 파기 기간이 같다
- [ ] 점검용으로 넣은 접수는 상태를 **스팸**으로 바꾸거나 대표 계정으로 삭제한다

> 홈페이지를 거치지 않고 접수 함수만 따로 확인하려면 (터미널에서):
> ```bash
> curl -i -X POST "https://<ref>.supabase.co/functions/v1/submit-inquiry" \
>   -H "content-type: application/json" -H "apikey: <공개 키>" \
>   -H "origin: https://www.greenpasture.co.kr" \
>   -d '{"kind":"contact","name":"테스트","phone":"010-0000-0000","email":"test@example.com","message":"접수 테스트","consent_privacy":true,"lang":"ko"}'
> ```
> `{"ok":true}` 가 오면 정상입니다. 실제로 1건이 저장되니 확인 후 정리하십시오.

---

## 9. 자주 생기는 문제

접수 함수는 실패하면 `{"ok":false,"error":"코드"}` 를 돌려줍니다. 브라우저 개발자도구(F12) → Network 탭이나 함수 Logs 에서 코드를 확인하십시오.

| 증상 | 원인 | 조치 |
|---|---|---|
| 양식을 제출하면 메일 앱이 열린다 | `assets/js/config.js` 가 비어 있음 | 5번 |
| `admin.html` 에 "아직 연결되지 않았습니다" | 같은 원인 | 5번 |
| `admin.html` 에 "라이브러리를 불러오지 못했습니다" | `cdn.jsdelivr.net` 이 회사 보안 프로그램·네트워크에서 막힘 | 다른 네트워크에서 시도, 보안 프로그램 예외 등록 |
| 접수 실패 + 콘솔에 CORS 오류, 또는 `origin_not_allowed` | 홈페이지 주소가 `ALLOWED_ORIGINS` 에 없음 | 4번 — `https://` 포함, 끝 `/` 없이 정확히. 목록 전체를 다시 적었는지 확인 |
| 접수 시 **401 Invalid JWT** | 함수의 JWT 검증이 켜져 있음 | 4번 — 끄거나 `--no-verify-jwt` 로 다시 배포 |
| `server_error` | 표를 만들지 않았거나(2번 누락) 권한이 빠짐 | 2번 SQL 을 다시 실행. 함수 Logs 에서 `insert failed` 내용 확인 |
| `captcha_failed` | 비밀 키만 등록하고 사이트 키는 없음 / Turnstile 에 도메인 미등록 | 5-1 — 사이트 키 먼저, 도메인 모두 등록 |
| 점검 중 `rate_limited` | 10분 3건 · 하루 10건 한도 (같은 IP) | 10분 기다리기. 급하면 SQL: `delete from public.submit_rate_log;` |
| 알림 메일이 안 옴 | 함수 Logs 에 `notify` 가 `skipped`(환경변수 누락) 또는 `failed 403`(도메인 미인증 상태에서 다른 주소로 발송) | 6번 |
| 알림 메일이 스팸함으로 감 | `onboarding@resend.dev` 발신 | 6-3 도메인 인증 |
| 로그인은 되는데 "관리자 명단에 없는 계정입니다" | `admin_users` 미등록 | 3-2 |
| 로그인 시 계속 "이메일 또는 비밀번호가 올바르지 않습니다" | 비밀번호 오류 또는 계정 미확인(Auto Confirm 누락) | Authentication → Users 에서 확인·비밀번호 재설정 |
| 삭제 버튼이 없음 | 직원(staff) 계정 | 대표(owner) 계정만 삭제 가능 — 3-2 |
| 한동안 안 쓰다가 갑자기 접수 실패, 응답 코드 **540** | 프로젝트 자동 정지 | 대시보드에서 **Resume project**, 7번 설정 확인 (90일 넘으면 복구 불가) |
| keepalive 가 빨간색 | 프로젝트 정지(540) 또는 시크릿의 주소·키 오류 | Actions 로그의 안내 문구 확인 |
| Supabase 에 사용자 지정 도메인을 붙인 뒤 `admin.html` 이 연결 안 됨 | `admin.html` 의 보안 정책(CSP)이 `*.supabase.co` 만 허용 | `admin.html` 상단 `connect-src` 에 새 주소 추가 |
| 연말 이후 갑자기 접수·관리자 화면이 모두 실패 | 예전 `anon`(`eyJ…`) 키 사용 중 — 2026년 말 종료 예정 | 5번 — `sb_publishable_…` 로 교체, 7번 시크릿도 교체 |

---

## 부록. 운영 참고 (SQL Editor 에서 실행)

**담당자 추가 · 역할 변경** — 3-1 로 계정을 만든 뒤 3-2 SQL 을 실행합니다.

**퇴사자 권한 즉시 회수**
```sql
delete from public.admin_users where email = '퇴사자@greenpasture.co.kr';
```
(Authentication → Users 에서 로그인 계정 자체도 삭제하십시오.)

**열람 기록 확인**
```sql
select at, email, action, target_id, detail
  from public.access_logs order by at desc limit 200;
```

**보관기간 지난 접수 파기** — 개인정보처리방침에 적은 보유기간과 반드시 같게 하십시오 (기본 36개월).
```sql
select public.purge_expired_inquiries(36);   -- 지워진 건수가 나옵니다
```

**보안 점검(Advisors → Security)에 계속 뜨는 항목 (정상입니다)**

| 표시되는 내용 | 왜 그대로 두는가 |
|---|---|
| `submit_rate_log` 에 RLS 는 켜져 있는데 정책이 없음 | **의도된 설정입니다.** 정책이 없으면 아무도 접근하지 못하고 접수 함수만 씁니다. |
| `is_admin()` · `is_owner()` · `log_access()` 를 로그인 사용자가 실행 가능 | **반드시 필요합니다.** 접근 규칙과 관리자 패널이 이 함수들을 씁니다. 로그인하지 않은 방문자는 실행할 수 없게 막아 두었고, `log_access()` 는 관리자 명단에 없으면 거부합니다. |
