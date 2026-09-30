/* =========================================================================
 * 문의 · 신청 양식 전송 (contact.html, apply.html)
 * -------------------------------------------------------------------------
 * ▸ 온라인 접수가 연결된 경우 (assets/js/config.js 의 SUPABASE_URL 이 채워짐)
 *     → Supabase 접수 함수(submit-inquiry)로 보내고, 관리자 페이지(admin.html)에서 확인합니다.
 * ▸ 아직 연결되지 않은 경우
 *     → 방문자의 메일 앱을 열어 FALLBACK_EMAIL 로 내용을 보내도록 안내합니다.
 * 양식은 데이터베이스에 직접 접근하지 않습니다.
 * ========================================================================= */
(function () {
  const cfg = window.GP_CONFIG || {};
  const API = String(cfg.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const form = document.querySelector('form[data-inquiry-form]');
  if (!form) return;

  const btn = form.querySelector('button[type=submit]');
  const box = document.getElementById('form-result');
  const lang = function () { return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ko'; };
  const L = function (ko, en) { return lang() === 'en' ? en : ko; };
  const esc = window.escapeHtml || function (s) { return String(s); };
  const TEL = cfg.TEL || '010-3497-2524';
  const MAIL = cfg.FALLBACK_EMAIL || 'ceo@greenpasture.co.kr';

  const KIND_LABEL = {
    contact: { ko: '문의', en: 'Inquiry' },
    quote:   { ko: '견적 요청', en: 'Quote request' },
    sample:  { ko: '샘플 신청', en: 'Sample request' },
    visit:   { ko: '시공 상담 · 방문 예약', en: 'Consultation / visit booking' },
    partner: { ko: '파트너 신청', en: 'Partnership application' },
    catalog: { ko: '자료 요청', en: 'Material request' }
  };
  const TIME_LABEL = { am: { ko: '오전', en: 'Morning' }, pm: { ko: '오후', en: 'Afternoon' }, any: { ko: '상관없음', en: 'Any time' } };

  /* ---------------- 신청 종류 ---------------- */
  function currentKind() {
    const fixed = form.dataset.inquiryForm;
    if (fixed && fixed !== 'select') return fixed;
    const r = form.querySelector('input[name="kind"]:checked');
    return r ? r.value : 'quote';
  }

  // data-show="quote sample" 인 칸은 해당 종류일 때만 보이고,
  // data-required-for="partner" 인 칸은 해당 종류일 때만 필수입니다.
  function applyKind() {
    const kind = currentKind();
    form.querySelectorAll('[data-show]').forEach(function (el) {
      const on = el.dataset.show.split(/\s+/).indexOf(kind) > -1;
      el.hidden = !on;
      el.querySelectorAll('input, select, textarea').forEach(function (f) { f.disabled = !on; });
    });
    form.querySelectorAll('[data-required-for]').forEach(function (f) {
      const req = f.dataset.requiredFor.split(/\s+/).indexOf(kind) > -1;
      f.required = req;
      const field = f.closest('.field');
      const mark = field && field.querySelector('.req-dyn');
      if (mark) mark.hidden = !req;
    });
    document.querySelectorAll('[data-kind-text]').forEach(function (el) {
      el.hidden = el.dataset.kindText !== kind;
    });
    if (form.dataset.inquiryForm === 'select') {
      const u = new URL(location.href);
      u.searchParams.set('type', kind);
      history.replaceState(null, '', u);
    }
  }

  if (form.dataset.inquiryForm === 'select') {
    const t = new URLSearchParams(location.search).get('type');
    const pre = t && form.querySelector(`input[name="kind"][value="${CSS.escape(t)}"]`);
    if (pre) pre.checked = true;
    form.addEventListener('change', function (e) { if (e.target.name === 'kind') applyKind(); });
  }
  applyKind();

  // 방문 희망일: 오늘 이후만 고를 수 있게
  const dateInput = form.querySelector('input[name="preferred_date"]');
  if (dateInput) {
    const now = new Date(Date.now() + 9 * 3600 * 1000); // 한국 시간 기준
    dateInput.min = now.toISOString().slice(0, 10);
    const max = new Date(now.getTime() + 365 * 86400000);
    dateInput.max = max.toISOString().slice(0, 10);
  }

  /* ---------------- 캡차 (Turnstile, 선택) ---------------- */
  let turnstileId = null;
  if (cfg.TURNSTILE_SITE_KEY && API) {
    const holder = document.createElement('div');
    holder.id = 'turnstile-holder';
    holder.style.marginTop = '20px';
    form.querySelector('.form-actions').before(holder);
    window.onTurnstileReady = function () {
      turnstileId = window.turnstile.render('#turnstile-holder', { sitekey: cfg.TURNSTILE_SITE_KEY, language: lang() });
    };
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit';
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }

  /* ---------------- 안내 메시지 ---------------- */
  const MSG = {
    kind_invalid:     ['신청 종류를 선택해 주십시오.', 'Please choose a request type.'],
    company_required: ['파트너 신청은 회사 · 기관명을 입력해 주셔야 합니다.', 'Please enter your company name for a partnership application.'],
    name_invalid:     ['성함을 정확히 입력해 주십시오.', 'Please enter your name.'],
    phone_invalid:    ['연락처 형식을 확인해 주십시오. (예: 010-0000-0000, +82 10 0000 0000)', 'Please check your phone number (e.g. +82 10 0000 0000).'],
    email_invalid:    ['이메일 주소를 확인해 주십시오.', 'Please check your e-mail address.'],
    date_required:    ['방문 희망일을 선택해 주십시오.', 'Please choose a preferred date.'],
    date_invalid:     ['방문 희망일은 오늘부터 1년 이내로 선택해 주십시오.', 'Please choose a date within the next 12 months.'],
    message_required: ['문의 내용을 입력해 주십시오.', 'Please enter your message.'],
    consent_required: ['개인정보 수집 · 이용에 동의해 주셔야 접수가 가능합니다.', 'Please agree to the collection and use of personal information.'],
    captcha_failed:   ['자동입력 방지 확인에 실패했습니다. 잠시 후 다시 시도해 주십시오.', 'Verification failed. Please try again shortly.'],
    rate_limited:     ['짧은 시간에 여러 번 접수하셨습니다. 잠시 후 다시 시도하시거나 전화로 연락 주십시오.', 'Too many submissions in a short time. Please try again later or call us.'],
    origin_not_allowed: ['접수 경로를 확인할 수 없습니다. 홈페이지 주소로 다시 접속해 주십시오.', 'Unrecognized origin. Please reload the site and try again.'],
    network:          ['인터넷 연결을 확인한 뒤 다시 시도해 주십시오.', 'Please check your connection and try again.']
  };
  function msg(code) {
    const m = MSG[code];
    return m ? L(m[0], m[1]) : L('접수 중 문제가 발생했습니다.', 'Something went wrong.');
  }
  function say(type, html) {
    if (!box) return;
    box.className = 'form-result ' + type;
    box.innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function fail(code) {
    say('bad', `<b>${L('접수되지 않았습니다.', 'Your request was not sent.')}</b><br>${esc(msg(code))}
      <span class="sub">${L('계속 문제가 생기면', 'If the problem continues, please call')} <a href="tel:${TEL.replace(/[^0-9+]/g, '')}">${TEL}</a>${L(' 또는 ', ' or e-mail ')}<a href="mailto:${MAIL}">${MAIL}</a>${L(' 로 연락 주십시오.', '.')}</span>`);
  }
  function markInvalid(name) {
    const f = form.querySelector(`[name="${name}"]`);
    const field = f && f.closest('.field');
    if (field) field.classList.add('is-invalid');
    if (f && f.focus) f.focus({ preventScroll: true });
  }
  form.addEventListener('input', function (e) {
    const field = e.target.closest('.field');
    if (field) field.classList.remove('is-invalid');
  });

  /* ---------------- 값 모으기 · 검사 ---------------- */
  function collect() {
    const d = new FormData(form);
    const g = function (k) { return String(d.get(k) || '').trim(); };
    return {
      kind: currentKind(),
      company: g('company'),
      name: g('name'),
      position: g('position'),
      phone: g('phone'),
      email: g('email'),
      country: g('country'),
      industry: g('industry'),
      topic: g('topic'),
      quantity: g('quantity'),
      region: g('region'),
      preferred_date: g('preferred_date'),
      preferred_time: g('preferred_time'),
      message: g('message'),
      consent_privacy: d.get('consent_privacy') === 'on',
      lang: lang(),
      website: g('website'),               // 사람에게는 보이지 않는 칸 (자동 입력 차단용)
      source_page: location.pathname + location.search,
      referrer: document.referrer || ''
    };
  }

  function validate(p) {
    if (!KIND_LABEL[p.kind]) return ['kind_invalid', null];
    if (p.kind === 'partner' && !p.company) return ['company_required', 'company'];
    if (p.name.length < 1 || p.name.length > 40) return ['name_invalid', 'name'];
    const digits = p.phone.replace(/\D/g, '');
    if (!/^[0-9+\-()\s]+$/.test(p.phone) || digits.length < 8 || digits.length > 20) return ['phone_invalid', 'phone'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email) || p.email.length > 120) return ['email_invalid', 'email'];
    if (p.kind === 'visit' && !p.preferred_date) return ['date_required', 'preferred_date'];
    if (p.preferred_date && dateInput && (p.preferred_date < dateInput.min || p.preferred_date > dateInput.max)) return ['date_invalid', 'preferred_date'];
    if (p.kind === 'contact' && !p.message) return ['message_required', 'message'];
    if (!p.consent_privacy) return ['consent_required', 'consent_privacy'];
    return null;
  }

  function summaryText(p) {
    const k = KIND_LABEL[p.kind];
    const rows = [
      [L('구분', 'Type'), k[lang()]],
      [L('회사 · 기관', 'Company'), p.company],
      [L('성함', 'Name'), p.name + (p.position ? ' / ' + p.position : '')],
      [L('연락처', 'Phone'), p.phone],
      [L('이메일', 'E-mail'), p.email],
      [L('국가', 'Country'), p.country],
      [L('산업 분야', 'Industry'), p.industry],
      [L('관심 제품 · 문의 분야', 'Product / topic'), p.topic],
      [L('수량 · 면적', 'Quantity / area'), p.quantity],
      [L('지역', 'Region'), p.region],
      [L('희망 일정', 'Preferred date'), p.preferred_date ? p.preferred_date + (p.preferred_time ? ' ' + TIME_LABEL[p.preferred_time][lang()] : '') : '']
    ].filter(function (r) { return r[1]; });
    return rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
      '\n\n' + L('내용', 'Message') + ':\n' + (p.message || L('(없음)', '(none)')) +
      '\n\n— ' + L('홈페이지에서 작성 · 개인정보 수집 · 이용 동의함', 'Sent from website · consent given');
  }

  function done(p) {
    const k = KIND_LABEL[p.kind];
    form.innerHTML = `<div class="form-done">
      <div class="mark">${ICON.check}</div>
      <h3>${esc(k[lang()])} ${L('접수가 완료되었습니다', 'has been received')}</h3>
      <p>${L('확인 후 남겨 주신 연락처로 담당자가 연락드리겠습니다.<br>영업일 기준 1~2일 이내에 회신드리는 것을 원칙으로 합니다.', 'Our team will get back to you shortly,<br>normally within 1–2 business days.')}</p>
      <p class="small muted" style="margin-top:14px">${L('급하신 경우', 'For urgent matters')} <a href="tel:${TEL.replace(/[^0-9+]/g, '')}">${TEL}</a></p>
      <div class="btn-row"><a class="btn btn--dark" href="index.html">${L('홈으로', 'Home')}</a><a class="btn btn--line" href="business.html">${L('사업 안내 보기', 'Our business')}</a></div>
    </div>`;
    form.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------------- 메일 앱으로 보내기 (온라인 접수 연결 전) ---------------- */
  function sendByMail(p) {
    const subject = `[${L('홈페이지', 'Website')} ${KIND_LABEL[p.kind][lang()]}] ${p.company ? p.company + ' ' : ''}${p.name}`;
    const body = summaryText(p);
    const href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    say('info', `<b>${L('메일 앱에서 전송 버튼을 눌러 주셔야 접수가 완료됩니다.', 'Please press “Send” in your e-mail app to complete your request.')}</b>
      <span class="sub">${L('메일 앱이 열리지 않으면 아래 버튼으로 내용을 복사해', 'If no e-mail app opened, copy the text below and send it to')} <a href="mailto:${MAIL}">${MAIL}</a>${L(' 로 보내 주시거나', ', or call')} <a href="tel:${TEL.replace(/[^0-9+]/g, '')}">${TEL}</a>${L(' 로 전화 주십시오.', '.')}</span>
      <div class="btn-row" style="margin-top:14px">
        <a class="btn btn--primary btn--sm" href="${href}">${L('메일 앱 다시 열기', 'Open e-mail app')}</a>
        <button type="button" class="btn btn--line btn--sm" id="copySummary">${L('내용 복사', 'Copy text')}</button>
      </div>`);
    const copy = document.getElementById('copySummary');
    if (copy) copy.addEventListener('click', function () {
      const text = 'To: ' + MAIL + '\nSubject: ' + subject + '\n\n' + body;
      const ok = function () { copy.textContent = L('복사되었습니다', 'Copied'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { window.prompt('', text); });
      else window.prompt(L('아래 내용을 복사하세요', 'Copy the text below'), text);
    });
    window.location.href = href;
  }

  /* ---------------- 전송 ---------------- */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (btn && btn.disabled) return;
    if (box) box.hidden = true;
    form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });

    const p = collect();
    if (p.website) { done(p); return; } // 자동 입력 프로그램은 조용히 종료

    const bad = validate(p);
    if (bad) { if (bad[1]) markInvalid(bad[1]); fail(bad[0]); return; }

    if (!API) { sendByMail(p); return; }

    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = L('접수 중입니다…', 'Sending…'); }
    try {
      p.turnstile_token = turnstileId !== null && window.turnstile ? window.turnstile.getResponse(turnstileId) : '';
      const res = await fetch(`${API}/functions/v1/${cfg.SUBMIT_FUNCTION || 'submit-inquiry'}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: cfg.SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify(p)
      });
      const out = await res.json().catch(function () { return {}; });
      if (res.ok && out.ok) { done(p); return; }
      if (out.error && ['company_required', 'name_invalid', 'phone_invalid', 'email_invalid', 'date_required', 'date_invalid', 'message_required'].indexOf(out.error) > -1) {
        markInvalid({ company_required: 'company', name_invalid: 'name', phone_invalid: 'phone', email_invalid: 'email', date_required: 'preferred_date', date_invalid: 'preferred_date', message_required: 'message' }[out.error]);
      }
      fail(out.error || 'server_error');
    } catch (err) {
      console.error(err);
      fail('network');
    } finally {
      if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = label; }
      if (turnstileId !== null && window.turnstile) window.turnstile.reset(turnstileId);
    }
  });
})();
