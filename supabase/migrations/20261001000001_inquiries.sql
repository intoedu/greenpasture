-- ============================================================
--  주식회사 그린파스처 · 온라인 문의·신청 저장소
--
--  적용 방법
--   Supabase 대시보드 > 왼쪽 메뉴 SQL Editor > New query 에
--   이 파일 내용을 전부 붙여넣고 Run 을 누르십시오. "Success" 가 뜨면 완료입니다.
--   여러 번 실행해도 안전합니다. (이미 있는 것은 건너뛰고, 권한·정책은 다시 맞춥니다)
--
--  접근 원칙
--   · 홈페이지(브라우저)는 이 표에 직접 손대지 못합니다.
--     접수는 Edge Function(submit-inquiry)만 할 수 있습니다.
--   · 조회는 admin_users 에 등록된 관리자만 가능합니다.
--   · 관리자도 접수 원문(회사명·이름·연락처·문의 내용 등)은 수정할 수 없고,
--     처리상태와 메모만 바꿀 수 있습니다. 처리자·처리시각은 데이터베이스가 직접 적습니다.
--   · 삭제와 열람기록 조회는 대표(owner) 계정만 가능합니다.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. 문의·신청 표
--    글자 수 제한은 접수 함수(submit-inquiry)의 검사 기준과 같습니다.
-- ------------------------------------------------------------
create table if not exists public.inquiries (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- 접수 구분
  kind              text not null
                      check (kind in ('contact','quote','sample','visit','partner','catalog')),
                      -- contact 문의하기 / quote 견적 요청 / sample 샘플 신청
                      -- visit 시공 상담·현장 방문 예약 / partner 파트너·대리점 신청
                      -- catalog 카탈로그·시험성적서 요청

  -- 고객 정보
  company           text check (char_length(company)  <= 100),   -- 회사명 (파트너 신청은 필수)
  name              text not null check (char_length(name) between 1 and 40),
  position          text check (char_length(position) <= 40),    -- 직함
  phone             text not null check (char_length(phone) <= 32),
  email             text not null check (char_length(email) <= 120),
  country           text check (char_length(country)  <= 60),

  -- 요청 내용
  industry          text check (char_length(industry) <= 60),    -- 업종 (생활가전, 건설자재 …)
  topic             text check (char_length(topic)    <= 100),   -- 관심 제품
  quantity          text check (char_length(quantity) <= 100),   -- 예상 수량 또는 시공 면적
  region            text check (char_length(region)   <= 100),   -- 시공 지역 / 희망 영업 지역
  preferred_date    date,                                         -- 희망일 (방문 예약은 필수)
  preferred_time    text check (preferred_time in ('am','pm','any')),
  message           text check (char_length(message)  <= 4000),

  -- 처리 현황
  status            text not null default 'new'
                      check (status in ('new','in_progress','quoted','done','closed','spam')),
                      -- 신규 / 상담중 / 견적 발송 / 완료 / 종료 / 스팸
  admin_memo        text check (char_length(admin_memo) <= 4000),
  handled_by        uuid references auth.users(id) on delete set null,
  handled_at        timestamptz,

  -- 동의 이력 (개인정보 수집·이용 동의)
  consent_privacy   boolean not null default false,
  consent_at        timestamptz,

  -- 접수 경로 (스팸 판별·유입 분석용)
  lang              text not null default 'ko' check (lang in ('ko','en')),
  source_page       text check (char_length(source_page) <= 300),
  referrer          text check (char_length(referrer)    <= 300),
  user_agent        text check (char_length(user_agent)  <= 300),
  ip_hash           text        -- 원문 IP는 저장하지 않습니다. 솔트 해시만 남깁니다.
);

comment on table  public.inquiries            is '홈페이지 온라인 문의·견적·샘플·방문·파트너·자료 요청 접수 내역';
comment on column public.inquiries.kind       is 'contact 문의 / quote 견적 요청 / sample 샘플 신청 / visit 시공 상담·방문 / partner 파트너 신청 / catalog 자료 요청';
comment on column public.inquiries.status     is 'new 신규 / in_progress 상담중 / quoted 견적 발송 / done 완료 / closed 종료 / spam 스팸';
comment on column public.inquiries.handled_by is '마지막으로 상태·메모를 저장한 관리자. 데이터베이스가 로그인 계정으로 직접 기록합니다.';
comment on column public.inquiries.ip_hash    is 'IP 원문이 아닌 솔트 해시. 중복·스팸 차단 목적으로만 사용합니다.';

create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx  on public.inquiries (status, created_at desc);
create index if not exists inquiries_kind_idx    on public.inquiries (kind, created_at desc);

-- ------------------------------------------------------------
-- 2. 수정 보호 트리거
--    · updated_at 자동 갱신
--    · 로그인한 관리자가 수정할 때는 처리 관련 칸(status, admin_memo)만 바뀌었는지 확인하고,
--      처리자(handled_by)·처리시각(handled_at)은 화면이 보낸 값 대신 실제 로그인 계정과 현재 시각으로 적습니다.
--      (아래 5번의 칸 단위 권한과 이중으로 막습니다)
--    · SQL Editor(postgres)나 접수 함수(service_role)에서의 수정은 검사하지 않습니다.
-- ------------------------------------------------------------
create or replace function public.inquiries_before_update()
returns trigger
language plpgsql security invoker set search_path = public
as $$
declare
  editable constant text[] := array['status','admin_memo','handled_by','handled_at','updated_at'];
begin
  new.updated_at := now();

  if current_user in ('authenticated', 'anon') then
    if (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable) then
      raise exception '접수 원문은 수정할 수 없습니다. 처리 상태와 메모만 바꿀 수 있습니다.'
        using errcode = '42501';
    end if;
    new.handled_by := auth.uid();
    new.handled_at := now();
  end if;

  return new;
end $$;

drop trigger if exists inquiries_before_update on public.inquiries;
create trigger inquiries_before_update
  before update on public.inquiries
  for each row execute function public.inquiries_before_update();

-- ------------------------------------------------------------
-- 3. 관리자 명단
--    로그인 계정이 있어도 여기 등록돼야 접수 내역을 볼 수 있습니다.
-- ------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  role       text not null default 'staff' check (role in ('owner','staff')),
  created_at timestamptz not null default now()
);

comment on table public.admin_users is '관리자 패널 접근 허용 명단. owner 는 삭제·열람기록 조회 권한까지 가집니다.';

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'owner') $$;

-- ------------------------------------------------------------
-- 4. 열람 기록
--    관리자 화면은 이 표에 직접 쓰지 못하고 log_access() 함수로만 남깁니다.
--    누가(user_id·email) 는 화면이 보낸 값이 아니라 로그인 계정으로 데이터베이스가 적습니다.
-- ------------------------------------------------------------
create table if not exists public.access_logs (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  user_id   uuid,
  email     text,
  action    text not null check (action in ('login','list','view','update','export','delete')),
  target_id uuid,
  detail    jsonb
);

create index if not exists access_logs_at_idx on public.access_logs (at desc);

comment on table public.access_logs is '관리자가 접수 내역을 조회·열람·수정·내보내기·삭제한 기록. 개인정보 안전성 확보조치 기준 대응.';

create or replace function public.log_access(
  p_action text,
  p_target uuid  default null,
  p_detail jsonb default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자 명단에 없는 계정입니다.' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('login','list','view','update','export','delete') then
    raise exception '알 수 없는 기록 종류입니다: %', p_action using errcode = '22023';
  end if;
  -- 기록이 지나치게 커지지 않도록 상세 정보는 약 4KB 까지만 받습니다
  if p_detail is not null and octet_length(p_detail::text) > 4000 then
    p_detail := jsonb_build_object('truncated', true);
  end if;

  insert into public.access_logs (user_id, email, action, target_id, detail)
  select auth.uid(), a.email, p_action, p_target, p_detail
    from public.admin_users a
   where a.user_id = auth.uid();
end $$;

comment on function public.log_access(text, uuid, jsonb)
  is '관리자 화면의 열람 기록용. 로그인한 관리자만 호출할 수 있고, 계정 정보는 데이터베이스가 직접 채웁니다.';

-- ------------------------------------------------------------
-- 5. 접수 속도 제한 기록 (Edge Function 전용)
-- ------------------------------------------------------------
create table if not exists public.submit_rate_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  ip_hash text not null
);

create index if not exists submit_rate_log_idx    on public.submit_rate_log (ip_hash, at desc);
create index if not exists submit_rate_log_at_idx on public.submit_rate_log (at);

-- 하루가 지난 기록은 쓸모가 없으므로 지웁니다. 접수 함수가 접수 때마다 호출합니다.
create or replace function public.cleanup_submit_rate_log()
returns integer
language plpgsql security definer set search_path = public
as $$
declare removed integer;
begin
  delete from public.submit_rate_log where at < now() - interval '2 days';
  get diagnostics removed = row_count;
  return removed;
end $$;

-- ------------------------------------------------------------
-- 6. 권한 — 기본 권한을 모두 회수한 뒤 필요한 것만 다시 부여
--    (Supabase 는 public 스키마의 새 표·함수에 anon/authenticated 권한을 자동으로 붙입니다.
--     그래서 표뿐 아니라 함수도 anon 에게서 명시적으로 회수합니다.)
-- ------------------------------------------------------------
--  접수 함수가 쓰는 service_role 도 기본으로는 모든 권한(삭제 포함)을 받으므로 함께 회수합니다.
--  (대시보드의 Table Editor·SQL Editor 는 service_role 이 아니라 관리용 계정으로 동작하므로 영향이 없습니다)
revoke all on public.inquiries       from public, anon, authenticated, service_role;
revoke all on public.admin_users     from public, anon, authenticated, service_role;
revoke all on public.access_logs     from public, anon, authenticated, service_role;
revoke all on public.submit_rate_log from public, anon, authenticated, service_role;

grant select on public.inquiries to authenticated;
-- 관리자도 접수 원문은 못 고칩니다. 처리 관련 칸만 수정 가능.
-- (handled_by / handled_at 은 화면이 함께 보내므로 권한은 주되, 실제 값은 2번 트리거가 덮어씁니다)
grant update (status, admin_memo, handled_by, handled_at) on public.inquiries to authenticated;
grant delete on public.inquiries to authenticated;   -- 실제 허용 여부는 아래 정책(owner)이 결정
grant select on public.admin_users to authenticated;
grant select on public.access_logs to authenticated; -- 실제 허용 여부는 아래 정책(owner)이 결정
-- access_logs 에 대한 insert 권한은 주지 않습니다. log_access() 함수로만 기록됩니다.

-- 접수 함수(Edge Function)가 쓰는 service_role 권한.
-- 프로젝트 생성 시 '새 표 자동 노출'을 끄면 이 권한이 자동으로 붙지 않으므로 명시적으로 부여합니다.
-- 이게 없으면 홈페이지 접수가 저장되지 않습니다. 필요한 최소한만 줍니다.
grant select, insert on public.inquiries       to service_role;
grant select, insert on public.submit_rate_log to service_role;

-- 함수 실행 권한
revoke execute on function public.is_admin()                        from public, anon;
revoke execute on function public.is_owner()                        from public, anon;
revoke execute on function public.log_access(text, uuid, jsonb)     from public, anon;
revoke execute on function public.cleanup_submit_rate_log()         from public, anon, authenticated;
revoke execute on function public.inquiries_before_update()         from public, anon, authenticated;
-- RLS 정책이 is_admin()/is_owner() 를 쓰므로 authenticated 의 실행 권한은 반드시 남겨 두어야 합니다.
grant  execute on function public.is_admin()                        to authenticated;
grant  execute on function public.is_owner()                        to authenticated;
grant  execute on function public.log_access(text, uuid, jsonb)     to authenticated;
grant  execute on function public.cleanup_submit_rate_log()         to service_role;

-- ------------------------------------------------------------
-- 7. 행 단위 접근통제 (RLS)
--    정책이 없는 역할은 아무것도 못 합니다 = 홈페이지 방문자(anon)는 접근 불가
-- ------------------------------------------------------------
alter table public.inquiries       enable row level security;
alter table public.admin_users     enable row level security;
alter table public.access_logs     enable row level security;
alter table public.submit_rate_log enable row level security;
-- submit_rate_log 에는 일부러 정책을 만들지 않습니다.
-- 정책이 없으면 아무도 접근할 수 없고, RLS를 우회하는 service_role(접수 함수)만 쓸 수 있습니다.
-- 보안 점검 도구가 'RLS Enabled No Policy' 로 알려 주는데, 이 표에서는 의도된 상태입니다.

drop policy if exists inquiries_select_admin on public.inquiries;
create policy inquiries_select_admin on public.inquiries
  for select to authenticated using (public.is_admin());

drop policy if exists inquiries_update_admin on public.inquiries;
create policy inquiries_update_admin on public.inquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists inquiries_delete_owner on public.inquiries;
create policy inquiries_delete_owner on public.inquiries
  for delete to authenticated using (public.is_owner());

drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self on public.admin_users
  for select to authenticated using (user_id = auth.uid() or public.is_owner());

drop policy if exists access_logs_select_owner on public.access_logs;
create policy access_logs_select_owner on public.access_logs
  for select to authenticated using (public.is_owner());

-- 예전 판(직접 insert 허용)을 적용한 적이 있다면 그 정책을 지웁니다
drop policy if exists access_logs_insert_admin on public.access_logs;

-- ------------------------------------------------------------
-- 8. 보관기간 경과분 파기
--    개인정보는 목적 달성 후 지체 없이 파기해야 합니다.
--    아래 함수를 주기적으로 돌리거나, SQL Editor 에서 수동으로 실행하십시오.
-- ------------------------------------------------------------
create or replace function public.purge_expired_inquiries(retain_months int default 36)
returns integer
language plpgsql security definer set search_path = public
as $$
declare removed integer;
begin
  delete from public.inquiries
   where created_at < now() - make_interval(months => retain_months);
  get diagnostics removed = row_count;

  delete from public.submit_rate_log where at < now() - interval '2 days';

  return removed;
end $$;

revoke all on function public.purge_expired_inquiries(int) from public, anon, authenticated;

comment on function public.purge_expired_inquiries(int)
  is '보관기간(기본 36개월)이 지난 접수 내역을 파기합니다. 기간은 홈페이지 개인정보처리방침과 반드시 일치시키십시오.';
