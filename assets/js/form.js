/* =========================================================================
 * 문의 · 신청 양식 전송 (contact.html, apply.html)
 * -------------------------------------------------------------------------
 * 서버 · 데이터베이스 없이 신청서를 "이메일"로 보냅니다. 방법은 assets/js/config.js 에서 고릅니다.
 *   ▸ apps-script : 구글 Apps Script 가 구글 시트에 기록하고 회사 이메일로 발송 (권장 · 기록 영구 보관)
 *   ▸ web3forms   : Web3Forms 가 회사 이메일로 바로 전달 (가장 간단 · 월 250건)
 *   ▸ 설정 전     : 방문자의 메일 앱을 열어 회사 이메일로 보내게 합니다
 * 어떤 방법이든 전송에 실패하면 '메일 앱으로 보내기'와 전화번호를 함께 안내해 신청이 끊기지 않게 합니다.
 * ========================================================================= */
(function () {
  const cfg = window.GP_CONFIG || {};
  const SERVICE = String(cfg.EMAIL_SERVICE || '').trim();
  const W3F_KEY = String(cfg.WEB3FORMS_ACCESS_KEY || '').trim();
  const GAS_URL = String(cfg.APPS_SCRIPT_URL || '').trim();
  // 실제로 쓸 수 있는 전송 방법 (키 · 주소가 비어 있으면 메일 앱 방식)
  // 'auto'(기본): 구글 시트 주소가 있으면 구글 시트, 없고 Web3Forms 키가 있으면 Web3Forms, 둘 다 없으면 메일 앱
  const GAS_OK = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(GAS_URL);
  const AUTO = !SERVICE || SERVICE === 'auto';
  const MODE = (SERVICE === 'apps-script' || AUTO) && GAS_OK ? 'apps-script'
    : (SERVICE === 'web3forms' || AUTO) && W3F_KEY ? 'web3forms'
    : 'mailto';
  const form = document.querySelector('form[data-inquiry-form]');
  if (!form) return;

  const btn = form.querySelector('button[type=submit]');
  const box = document.getElementById('form-result');
  const lang = function () { return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ko'; };
  const L = function (ko, en) { return lang() === 'en' ? en : ko; };
  const esc = window.escapeHtml || function (s) { return String(s); };
  const TEL = cfg.TEL || '010-3497-2524';
  const TEL_INTL = cfg.TEL_INTL || '+82 10-3497-2524';
  const TEL_HREF = 'tel:' + TEL_INTL.replace(/[^0-9+]/g, '');
  const MAIL = cfg.RECEIVER_EMAIL || cfg.FALLBACK_EMAIL || 'ceo@greenpasture.co.kr';
  const telLink = function () { return `<a href="${TEL_HREF}">${lang() === 'en' ? TEL_INTL : TEL}</a>`; };

  const KIND_LABEL = {
    contact: { ko: '문의', en: 'Inquiry' },
    quote:   { ko: '견적 요청', en: 'Quote request' },
    sample:  { ko: '샘플 신청', en: 'Sample request' },
    visit:   { ko: '시공 상담 · 방문 예약', en: 'Consultation / visit booking' },
    partner: { ko: '파트너 신청', en: 'Partnership application' },
    catalog: { ko: '자료 요청', en: 'Document request' }
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
    rate_limited:     ['짧은 시간에 여러 번 보내셨습니다. 잠시 후 다시 시도하시거나 아래 방법으로 연락 주십시오.', 'Too many submissions in a short time. Please try again later or use the options below.'],
    send_failed:      ['신청서를 이메일로 보내지 못했습니다. 아래 버튼으로 메일 앱에서 보내 주시거나 전화 주십시오.', 'We could not send your request by e-mail. Please send it from your e-mail app using the button below, or call us.'],
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
  function fail(code, p) {
    say('bad', `<b>${L('접수되지 않았습니다.', 'Your request was not sent.')}</b><br>${esc(msg(code))}
      <span class="sub">${L('계속 문제가 생기면', 'If the problem continues, please call')} ${telLink()}${L(' 또는 ', ' or e-mail ')}<a href="mailto:${MAIL}">${MAIL}</a>${L(' 로 연락 주십시오.', '.')}</span>
      ${p ? `<div class="btn-row" style="margin-top:14px"><a class="btn btn--primary btn--sm" href="${mailHref(p).href}">${L('메일 앱으로 보내기', 'Send from e-mail app')}</a></div>` : ''}`);
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

  // 메일에 들어갈 항목 — 회사 담당자와 해외 신청자 모두 읽을 수 있게 한/영 병기
  function fieldRows(p) {
    const k = KIND_LABEL[p.kind];
    return [
      ['구분 / Type', k.ko + (p.lang === 'en' ? ' (' + k.en + ')' : '')],
      ['회사 · 기관 / Company', p.company],
      ['성함 / Name', p.name + (p.position ? ' (' + p.position + ')' : '')],
      ['연락처 / Phone', p.phone],
      ['이메일 / E-mail', p.email],
      ['국가 / Country', p.country],
      ['산업 분야 / Industry', p.industry],
      ['관심 제품 · 요청 자료 / Product · Documents', p.topic],
      ['수량 · 면적 / Quantity · Area', p.quantity],
      ['지역 / Region', p.region],
      ['희망 일정 / Preferred date', p.preferred_date ? p.preferred_date + (p.preferred_time ? ' ' + TIME_LABEL[p.preferred_time].ko : '') : ''],
      ['작성 언어 / Language', p.lang === 'en' ? 'English' : '한국어'],
      ['작성 페이지 / Page', p.source_page]
    ].filter(function (r) { return r[1]; });
  }
  function subjectOf(p) {
    return `[홈페이지 ${KIND_LABEL[p.kind].ko}] ${p.company ? p.company + ' / ' : ''}${p.name}`;
  }
  function summaryText(p, maxMessage) {
    let message = p.message || '(없음 / none)';
    if (maxMessage && message.length > maxMessage) {
      message = message.slice(0, maxMessage) + L('… (길어서 줄였습니다. 전체 내용은 붙여넣어 주세요)', '… (shortened — please paste the full text)');
    }
    return fieldRows(p).map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
      '\n\n내용 / Message:\n' + message +
      '\n\n— 홈페이지에서 작성 · 개인정보 수집 · 이용 동의 / Sent from the website with privacy consent';
  }
  // 메일 앱 주소 — 너무 길면 일부 메일 앱이 잘라내므로 본문을 줄입니다
  function mailHref(p) {
    const subject = subjectOf(p);
    let body = summaryText(p);
    let shortened = false;
    if (encodeURIComponent(body).length > 1800) { body = summaryText(p, 300); shortened = true; }
    return { href: `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, subject: subject, shortened: shortened };
  }

  function done(p) {
    const k = KIND_LABEL[p.kind];
    form.innerHTML = `<div class="form-done">
      <div class="mark">${ICON.check}</div>
      <h3>${L(esc(k.ko) + ' 접수가 완료되었습니다', 'Thank you — your ' + esc(k.en.toLowerCase()) + ' has been sent')}</h3>
      <p>${L('신청서가 담당자 이메일로 전달되었습니다.<br>확인 후 남겨 주신 연락처로 연락드리겠습니다.', 'Your request has been delivered to our team by e-mail.<br>We will contact you using the details you provided.')}</p>
      <p class="small muted" style="margin-top:14px">${L('급하신 경우 전화', 'For urgent matters, call')} ${telLink()}</p>
      <div class="btn-row"><a class="btn btn--dark" href="index.html">${L('홈으로', 'Home')}</a><a class="btn btn--line" href="business.html">${L('사업 안내 보기', 'Our business')}</a></div>
    </div>`;
    form.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------------- 메일 앱으로 보내기 (전송 서비스 설정 전) ---------------- */
  function sendByMail(p) {
    const m = mailHref(p);
    const subject = m.subject;
    const body = summaryText(p);
    const href = m.href;
    say('info', `<b>${L('메일 앱에서 전송 버튼을 눌러 주셔야 접수가 완료됩니다.', 'Please press “Send” in your e-mail app to complete your request.')}</b>
      <span class="sub">${m.shortened ? L('내용이 길어 메일 본문에는 앞부분만 넣었습니다. 아래 “내용 복사”로 전체를 붙여넣어 주십시오. ', 'Your message was long, so only the beginning was added. Use “Copy text” below to paste the full text. ') : ''}${L('메일 앱이 열리지 않으면 아래 “내용 복사” 버튼으로 내용을 복사해', 'If your e-mail app did not open, use the “Copy text” button below and send the text to')} <a href="mailto:${MAIL}">${MAIL}</a>${L(' 로 보내 주시거나 ', ', or call ')}${telLink()}${L(' 로 전화 주십시오.', '.')}</span>
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

  /* ---------------- 이메일 전송 서비스 ---------------- */
  // Web3Forms — https://web3forms.com  (Access Key 는 공개돼도 되는 값입니다)
  async function sendWeb3Forms(p) {
    const payload = {
      access_key: W3F_KEY,
      subject: subjectOf(p),
      from_name: '그린파스처 홈페이지',
      name: p.name,
      email: p.email,          // 받은 메일에서 '답장'을 누르면 신청자에게 갑니다
      replyto: p.email
    };
    fieldRows(p).forEach(function (r) { if (!(r[0] in payload)) payload[r[0]] = r[1]; });
    payload['내용 / Message'] = p.message || '(없음 / none)';
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const out = await res.json().catch(function () { return {}; });
    if (res.ok && out.success) return true;
    if (res.status === 429) return 'rate_limited';
    console.error('Web3Forms', res.status, out && out.message);
    return false;
  }

  // 구글 Apps Script — tools/apps-script/Code.gs 를 배포한 웹 앱 주소로 보냅니다.
  // Content-Type 을 지정하지 않아(text/plain) 브라우저 사전 요청 없이 전송됩니다.
  async function sendAppsScript(p) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        subject: subjectOf(p),
        replyTo: p.email,
        kind: p.kind,
        rows: fieldRows(p),
        message: p.message,
        website: p.website
      })
    });
    const out = await res.json().catch(function () { return {}; });
    if (out.ok) return true;
    if (out.error === 'rate_limited') return 'rate_limited';
    console.error('Apps Script', res.status, out && out.error);
    return false;
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

    if (MODE === 'mailto') { sendByMail(p); return; }

    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = L('보내는 중입니다…', 'Sending…'); }
    try {
      const ok = MODE === 'web3forms' ? await sendWeb3Forms(p) : await sendAppsScript(p);
      if (ok === true) { done(p); return; }
      fail(ok === 'rate_limited' ? 'rate_limited' : 'send_failed', p);
    } catch (err) {
      console.error(err);
      fail(navigator.onLine === false ? 'network' : 'send_failed', p);
    } finally {
      if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = label; }
    }
  });
})();
