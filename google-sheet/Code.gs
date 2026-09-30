/* =========================================================================
 * 주식회사 그린파스처 홈페이지 · 문의/신청 → 구글 시트 접수
 * -------------------------------------------------------------------------
 * 이 코드는 "그린파스처 홈페이지 접수" 구글 시트의
 *   [확장 프로그램] → [Apps Script] 에 통째로 붙여 넣어 씁니다.
 * 설치 순서는 docs/GOOGLE-SHEET.md 를 보십시오.
 *
 * 하는 일
 *   1) 홈페이지 양식이 보낸 내용을 다시 검사하고, 시트에 한 줄로 저장합니다.
 *   2) 담당자에게 알림 메일을 보냅니다.
 *      구글 하루 발송 한도(일반 계정 100명)를 넘으면 메일만 건너뛰고, 저장은 그대로 됩니다.
 *   3) (선택) 텔레그램으로도 알립니다.
 *
 * 비밀 값(텔레그램 토큰, 캡차 비밀 키)은 이 코드에 적지 마십시오.
 *   [프로젝트 설정(톱니바퀴)] → [스크립트 속성] 에 넣습니다.
 *     TELEGRAM_BOT_TOKEN  · TELEGRAM_CHAT_ID   → 텔레그램 알림 (둘 다 있을 때만 동작)
 *     TURNSTILE_SECRET                         → 캡차 검증 (있을 때만 동작)
 *
 * 코드를 고친 뒤에는 반드시 [배포] → [배포 관리] → 연필 → 버전 "새 버전" → [배포]
 * 를 해야 홈페이지에 반영됩니다. (주소는 그대로 유지됩니다)
 * ========================================================================= */

const CONFIG = {
  SHEET_NAME: '접수',
  // 새 접수 알림을 받을 메일. 여러 명이면 ['a@x.com', 'b@y.com'] 처럼 추가합니다.
  // 받는 사람 1명당 하루 한도 1건을 씁니다.
  NOTIFY_EMAILS: ['info@intomarketing.co.kr'],
  SENDER_NAME: '그린파스처 홈페이지',
  TIMEZONE: 'Asia/Seoul',
  STATUS_LIST: ['신규', '확인', '상담 중', '견적·샘플 발송', '완료', '보류'],
  SAME_PERSON_WAIT_SEC: 60,   // 같은 연락처 · 이메일로 다시 접수할 수 있는 최소 간격(초)
  MAX_PER_10MIN: 30,          // 10분 동안 받을 수 있는 최대 건수 (스팸 폭주 방지)
  KEEP_YEARS: 3               // deleteExpired() 가 지우는 기준 (접수일로부터 N년)
};

/* 시트 열 구성 — 순서를 바꾸면 이미 쌓인 내용과 어긋나니, 바꿀 때는 새 시트에서 시작하십시오. */
const COLUMNS = [
  { key: '_id',            title: '접수번호',            width: 130 },
  { key: '_at',            title: '접수일시',            width: 140 },
  { key: '_status',        title: '처리상태',            width: 110 },
  { key: '_memo',          title: '담당자 메모',          width: 220 },
  { key: '_kind',          title: '구분',               width: 160 },
  { key: 'company',        title: '회사·기관',            width: 150 },
  { key: 'name',           title: '성함',               width: 90 },
  { key: 'position',       title: '부서·직함',            width: 110 },
  { key: 'phone',          title: '연락처',              width: 130 },
  { key: 'email',          title: '이메일',              width: 190 },
  { key: 'country',        title: '국가',               width: 80 },
  { key: 'industry',       title: '산업 분야',            width: 170 },
  { key: 'topic',          title: '관심 제품·문의 분야',    width: 200 },
  { key: 'quantity',       title: '수량·면적',            width: 120 },
  { key: 'region',         title: '지역',               width: 120 },
  { key: 'preferred_date', title: '희망일',              width: 100 },
  { key: '_time',          title: '희망 시간',            width: 80 },
  { key: 'message',        title: '내용',               width: 320 },
  { key: '_lang',          title: '작성 언어',            width: 80 },
  { key: 'source_page',    title: '접수 페이지',          width: 160 },
  { key: 'referrer',       title: '유입 경로',            width: 200 },
  { key: '_consent',       title: '개인정보 동의',         width: 100 },
  { key: '_notice',        title: '알림 발송',            width: 170 }
];

const KIND_KO = {
  contact: '문의',
  quote: '견적 요청',
  sample: '샘플 신청',
  visit: '시공 상담 · 방문 예약',
  partner: '파트너 신청',
  catalog: '자료 요청'
};
const TIME_KO = { am: '오전', pm: '오후', any: '상관없음' };

/* 입력값 최대 길이 (홈페이지 양식과 같거나 조금 넉넉하게) */
const MAX_LEN = {
  kind: 10, company: 100, name: 40, position: 40, phone: 24, email: 120, country: 60,
  industry: 120, topic: 120, quantity: 100, region: 100, preferred_date: 10, preferred_time: 3,
  message: 4000, lang: 2, source_page: 300, referrer: 500
};


/* =========================================================================
 * 1. 처음 한 번 실행 — 시트 모양 갖추기 + 권한 허용
 *    Apps Script 화면 위쪽에서 함수 "setup" 을 고르고 [실행] 을 누르십시오.
 * ========================================================================= */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  const sh = prepareSheet_(ss);
  // 메일 권한도 이 자리에서 함께 허용되도록 남은 한도를 한 번 읽습니다.
  const left = MailApp.getRemainingDailyQuota();
  console.log('시트 준비 완료: "' + sh.getName() + '" · 오늘 남은 메일 발송 한도: ' + left + '명');
}

/* 알림 메일이 제대로 가는지 시험 (NOTIFY_EMAILS 로 시험 메일 1통) */
function testNotify() {
  const d = {
    kind: 'quote', company: '(시험) 그린파스처', name: '홍길동', position: '', phone: '010-0000-0000',
    email: CONFIG.NOTIFY_EMAILS[0] || 'test@example.com', country: '', industry: '', topic: 'V-ZERO 오리지널 원액',
    quantity: '20L', region: '', preferred_date: '', preferred_time: '', message: '알림 시험입니다. 이 메일은 무시하셔도 됩니다.',
    lang: 'ko', source_page: '/apply.html', referrer: ''
  };
  console.log('결과: ' + notify_(d, 'GP-TEST', '', true));
}

/* 3년(KEEP_YEARS)이 지난 접수를 지웁니다. 되돌릴 수 없습니다.
 * 자동으로 돌리려면 [트리거] → [트리거 추가] → deleteExpired · 시간 기반 · 월 단위 로 등록하십시오. */
function deleteExpired() {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - CONFIG.KEEP_YEARS);
  const atCol = colOf_('_at');
  const dates = sh.getRange(2, atCol, last - 1, 1).getValues();
  let removed = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const v = dates[i][0];
    if (v instanceof Date && v < cutoff) { sh.deleteRow(i + 2); removed++; }
  }
  console.log('보관 기간이 지난 접수 ' + removed + '건을 삭제했습니다.');
}


/* =========================================================================
 * 2. 홈페이지와 연결되는 부분
 * ========================================================================= */

/* 배포 주소를 브라우저로 열었을 때 — 연결 확인용 */
function doGet() {
  return ContentService.createTextOutput('그린파스처 홈페이지 접수 연결이 정상입니다. (이 주소를 assets/js/config.js 의 SHEET_URL 에 넣으십시오)');
}

/* 홈페이지 양식이 접수 내용을 보내는 곳 */
function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (!raw || raw.length > 30000) return reply_({ ok: false, error: 'bad_request' });

    let p;
    try { p = JSON.parse(raw); } catch (err) { return reply_({ ok: false, error: 'bad_request' }); }
    if (!p || typeof p !== 'object' || Array.isArray(p)) return reply_({ ok: false, error: 'bad_request' });

    // 사람에게는 보이지 않는 칸이 채워져 있으면 자동 입력 프로그램 → 저장하지 않고 성공처럼 응답
    if (str_(p.website)) return reply_({ ok: true });

    const d = clean_(p);
    const bad = validate_(d);
    if (bad) return reply_({ ok: false, error: bad });

    if (!verifyCaptcha_(p.turnstile_token)) return reply_({ ok: false, error: 'captcha_failed' });
    if (isRateLimited_(d)) return reply_({ ok: false, error: 'rate_limited' });

    const lock = LockService.getScriptLock();
    try { lock.waitLock(20000); } catch (err) { return reply_({ ok: false, error: 'busy' }); }

    let sh, row, id;
    try {
      sh = getSheet_();
      row = Math.max(sh.getLastRow(), 1) + 1;
      if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
      const now = new Date();
      id = 'GP-' + Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyMMdd') + '-' + nextSeq_();
      sh.getRange(row, 1, 1, COLUMNS.length).setValues([buildRow_(d, id, now)]);
      sh.getRange(row, colOf_('_at')).setNumberFormat('yyyy-mm-dd hh:mm');
      sh.getRange(row, colOf_('_status')).setDataValidation(statusRule_());
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    rememberPerson_(d);

    // 알림은 저장이 끝난 뒤에 보냅니다. 알림이 실패해도 접수는 이미 저장되어 있습니다.
    const link = sh.getParent().getUrl() + '#gid=' + sh.getSheetId() + '&range=A' + row;
    const notice = notify_(d, id, link, false);
    sh.getRange(row, colOf_('_notice')).setValue(notice);

    return reply_({ ok: true, id: id });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return reply_({ ok: false, error: 'server_error' });
  }
}


/* =========================================================================
 * 3. 검사 · 저장
 * ========================================================================= */

function str_(v) {
  return (v === null || v === undefined) ? '' : String(v);
}

/* 앞뒤 공백 제거, 길이 제한, 보이지 않는 제어 문자 제거 */
function clean_(p) {
  const d = {};
  Object.keys(MAX_LEN).forEach(function (k) {
    let v = str_(p[k]).replace(/\r\n?/g, '\n');
    v = k === 'message'
      ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      : v.replace(/[\u0000-\u001F\u007F]/g, ' ');
    d[k] = v.trim().slice(0, MAX_LEN[k]);
  });
  d.email = d.email.toLowerCase();
  d.consent_privacy = p.consent_privacy === true;
  return d;
}

/* 홈페이지 양식과 같은 기준으로 한 번 더 검사합니다. (양식을 거치지 않은 접수도 막기 위해) */
function validate_(d) {
  if (!KIND_KO[d.kind]) return 'kind_invalid';
  if (d.kind === 'partner' && !d.company) return 'company_required';
  if (d.name.length < 1) return 'name_invalid';
  const digits = d.phone.replace(/\D/g, '');
  if (!/^[0-9+\-()\s]+$/.test(d.phone) || digits.length < 8 || digits.length > 20) return 'phone_invalid';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return 'email_invalid';
  if (d.kind === 'visit' && !d.preferred_date) return 'date_required';
  if (d.preferred_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.preferred_date)) return 'date_invalid';
    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const max = Utilities.formatDate(new Date(Date.now() + 366 * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (d.preferred_date < today || d.preferred_date > max) return 'date_invalid';
  }
  if (d.preferred_time && !TIME_KO[d.preferred_time]) d.preferred_time = '';
  if (d.kind === 'contact' && !d.message) return 'message_required';
  if (!d.consent_privacy) return 'consent_required';
  return null;
}

/* 캡차 비밀 키(TURNSTILE_SECRET)가 등록되어 있을 때만 검사합니다. */
function verifyCaptcha_(token) {
  const secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: secret, response: String(token).slice(0, 2048) },
      muteHttpExceptions: true
    });
    const out = JSON.parse(res.getContentText() || '{}');
    return out.success === true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

/* 반복 접수 · 폭주 차단 */
function personKey_(d) {
  const raw = d.phone.replace(/\D/g, '') + '|' + d.email;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return 'p:' + Utilities.base64EncodeWebSafe(bytes).slice(0, 40);
}
function isRateLimited_(d) {
  const cache = CacheService.getScriptCache();
  if (cache.get(personKey_(d))) return true;
  const winKey = 'w:' + Math.floor(Date.now() / 600000);
  const count = Number(cache.get(winKey) || 0);
  if (count >= CONFIG.MAX_PER_10MIN) return true;
  cache.put(winKey, String(count + 1), 660);
  return false;
}
function rememberPerson_(d) {
  CacheService.getScriptCache().put(personKey_(d), '1', Math.max(1, CONFIG.SAME_PERSON_WAIT_SEC));
}

/* 방문자가 적은 값은 모두 "글자"로 저장합니다.
 * - = + - @ 로 시작하는 값이 수식으로 실행되는 것을 막고 (수식 주입 차단)
 * - 01012345678 처럼 숫자만 적은 연락처의 앞자리 0 이 사라지지 않게 합니다.
 * 맨 앞의 ' 는 시트 화면에는 보이지 않습니다. */
function asText_(v) {
  return v ? "'" + v : '';
}

function buildRow_(d, id, now) {
  return COLUMNS.map(function (c) {
    switch (c.key) {
      case '_id': return id;
      case '_at': return now;
      case '_status': return CONFIG.STATUS_LIST[0];
      case '_memo': return '';
      case '_kind': return KIND_KO[d.kind];
      case '_time': return d.preferred_time ? TIME_KO[d.preferred_time] : '';
      case '_lang': return d.lang === 'en' ? '영어' : '한국어';
      case '_consent': return '동의';
      case '_notice': return '보내는 중';
      default: return asText_(d[c.key]);
    }
  });
}

/* 접수번호 일련번호. 줄을 지워도 번호가 겹치지 않도록 따로 셉니다. (잠금 안에서만 호출) */
function nextSeq_() {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty('SEQ') || 0) + 1;
  props.setProperty('SEQ', String(n));
  return n < 10000 ? ('000' + n).slice(-4) : String(n);
}

function colOf_(key) {
  for (let i = 0; i < COLUMNS.length; i++) if (COLUMNS[i].key === key) return i + 1;
  throw new Error('없는 열: ' + key);
}

function statusRule_() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.STATUS_LIST, true)
    .setAllowInvalid(true)
    .build();
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(CONFIG.SHEET_NAME) || prepareSheet_(ss);
}

/* "접수" 탭을 찾거나 만들고, 머리글 · 모양을 갖춥니다. 여러 번 실행해도 안전합니다. */
function prepareSheet_(ss) {
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) {
    const first = ss.getSheets()[0];
    const firstHeader = first.getLastRow() > 0 ? String(first.getRange(1, 1).getValue()) : '';
    // 비어 있거나 이미 같은 머리글이 있는 첫 탭이면 이름만 바꿔 씁니다.
    if (first.getLastRow() === 0 || firstHeader === COLUMNS[0].title) {
      sh = first.setName(CONFIG.SHEET_NAME);
    } else {
      sh = ss.insertSheet(CONFIG.SHEET_NAME, 0);
    }
  }

  const n = COLUMNS.length;
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
  const header = sh.getRange(1, 1, 1, n);
  header.setValues([COLUMNS.map(function (c) { return c.title; })])
    .setFontWeight('bold')
    .setBackground('#0B1F3A')
    .setFontColor('#FFFFFF')
    .setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.setRowHeight(1, 34);
  COLUMNS.forEach(function (c, i) { sh.setColumnWidth(i + 1, c.width); });

  const rows = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, colOf_('_status'), rows, 1).setDataValidation(statusRule_());
  sh.getRange(2, colOf_('_at'), rows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(2, colOf_('message'), rows, 1).setWrap(true);

  // "신규" 인 줄은 옅은 노란색으로 표시 (처리상태를 바꾸면 색이 빠집니다)
  const statusLetter = sh.getRange(1, colOf_('_status')).getA1Notation().replace(/\d+/g, '');
  const whole = sh.getRange(2, 1, rows, n);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusLetter + '2="' + CONFIG.STATUS_LIST[0] + '"')
    .setBackground('#FFF6D6')
    .setRanges([whole])
    .build();
  const others = sh.getConditionalFormatRules().filter(function (r) {
    const f = r.getBooleanCondition() && r.getBooleanCondition().getCriteriaValues();
    return !(f && String(f[0]).indexOf('="' + CONFIG.STATUS_LIST[0] + '"') > -1);
  });
  sh.setConditionalFormatRules(others.concat([rule]));
  return sh;
}


/* =========================================================================
 * 4. 알림
 * ========================================================================= */

function esc_(s) {
  return str_(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function notify_(d, id, link, isTest) {
  const results = [];
  const kind = KIND_KO[d.kind] || d.kind;

  /* ---- 메일 ---- */
  const to = CONFIG.NOTIFY_EMAILS.filter(function (x) { return x && x.indexOf('@') > 0; });
  if (to.length) {
    try {
      const left = MailApp.getRemainingDailyQuota();
      if (left >= to.length) {
        const rows = [
          ['접수번호', id],
          ['구분', kind],
          ['회사·기관', d.company],
          ['성함', d.name + (d.position ? ' / ' + d.position : '')],
          ['연락처', d.phone],
          ['이메일', d.email],
          ['국가', d.country],
          ['산업 분야', d.industry],
          ['관심 제품·문의 분야', d.topic],
          ['수량·면적', d.quantity],
          ['지역', d.region],
          ['희망 일정', d.preferred_date ? d.preferred_date + (d.preferred_time ? ' ' + TIME_KO[d.preferred_time] : '') : ''],
          ['작성 언어', d.lang === 'en' ? '영어' : '한국어']
        ].filter(function (r) { return r[1]; });

        const html =
          '<div style="font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">' +
          '<p style="margin:0 0 12px"><b>그린파스처 홈페이지에 새 ' + esc_(kind) + ' 접수가 들어왔습니다.</b></p>' +
          '<table style="border-collapse:collapse;min-width:360px">' +
          rows.map(function (r) {
            return '<tr><th style="text-align:left;padding:6px 12px 6px 0;color:#666;font-weight:normal;vertical-align:top;white-space:nowrap">' +
              esc_(r[0]) + '</th><td style="padding:6px 0">' + esc_(r[1]) + '</td></tr>';
          }).join('') +
          '</table>' +
          '<p style="margin:16px 0 4px;color:#666">내용</p>' +
          '<div style="white-space:pre-wrap;border-left:3px solid #1E6BFF;padding:4px 0 4px 12px">' + esc_(d.message || '(없음)') + '</div>' +
          (link ? '<p style="margin:20px 0 0"><a href="' + esc_(link) + '" style="color:#1E6BFF">구글 시트에서 보기 · 처리상태 바꾸기 →</a></p>' : '') +
          '<p style="margin:20px 0 0;font-size:12px;color:#888">이 메일에 답장하면 신청자(' + esc_(d.email) + ')에게 바로 전달됩니다.<br>' +
          '개인정보가 담긴 메일입니다. 다른 사람에게 전달하거나 오래 보관하지 마십시오.</p>' +
          '</div>';

        const text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
          '\n\n내용:\n' + (d.message || '(없음)') + (link ? '\n\n시트에서 보기: ' + link : '');

        MailApp.sendEmail({
          to: to.join(','),
          subject: (isTest ? '[시험] ' : '') + '[그린파스처 홈페이지 · ' + kind + '] ' + (d.company ? d.company + ' · ' : '') + d.name + ' (' + id + ')',
          body: text,
          htmlBody: html,
          name: CONFIG.SENDER_NAME,
          replyTo: d.email
        });
        results.push('메일 보냄');
      } else {
        results.push('메일 한도 초과로 안 보냄');
      }
    } catch (err) {
      console.error(err);
      results.push('메일 실패');
    }
  }

  /* ---- 텔레그램 (선택) ---- */
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chat = props.getProperty('TELEGRAM_CHAT_ID');
  if (token && chat) {
    try {
      // 개인정보를 줄이기 위해 성함 · 연락처는 넣지 않습니다. 자세한 내용은 시트에서 확인합니다.
      const msg = (isTest ? '[시험] ' : '') + '🔔 그린파스처 새 접수\n' + kind + ' · ' + (d.company || '개인') + '\n접수번호 ' + id + '\n구글 시트에서 확인해 주십시오.';
      const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ chat_id: chat, text: msg, disable_web_page_preview: true }),
        muteHttpExceptions: true
      });
      results.push(res.getResponseCode() === 200 ? '텔레그램 보냄' : '텔레그램 실패');
    } catch (err) {
      console.error(err);
      results.push('텔레그램 실패');
    }
  }

  return results.length ? results.join(' · ') : '알림 설정 없음';
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
