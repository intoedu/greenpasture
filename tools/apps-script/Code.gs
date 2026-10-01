/* =========================================================================
 * 그린파스처 홈페이지 신청서 → 구글 시트 기록 + 이메일 발송 (Google Apps Script)
 * -------------------------------------------------------------------------
 * 이 방식은 선택 사항입니다. 기본은 Web3Forms 입니다. (docs/이메일-접수-설정.md)
 *
 * 설치 (약 5분)
 *   1) 구글 드라이브에서 새 스프레드시트를 만듭니다. (예: "그린파스처 홈페이지 신청서")
 *   2) 메뉴 [확장 프로그램] → [Apps Script] 를 열고, 이 파일 내용을 전부 붙여넣고 저장합니다.
 *   3) 아래 RECEIVER 를 신청서를 받을 이메일로 바꿉니다.
 *   4) [배포] → [새 배포] → 유형 "웹 앱"
 *        - 실행 사용자: 나
 *        - 액세스 권한: 모든 사용자
 *      → 권한 승인 → 표시되는 "웹 앱 URL"(https://script.google.com/macros/s/…/exec)을 복사
 *   5) 홈페이지 assets/js/config.js 에서
 *        EMAIL_SERVICE: 'apps-script',  APPS_SCRIPT_URL: '복사한 주소'
 *
 * 한도: 개인 구글 계정은 하루 이메일 수신자 100명까지 (Google 공식 문서 기준, 변경될 수 있음)
 * 코드를 고친 뒤에는 [배포] → [배포 관리] → 수정 → "새 버전" 으로 다시 배포해야 반영됩니다.
 * ========================================================================= */

const RECEIVER = 'ceo@greenpasture.co.kr';   // ← 신청서를 받을 이메일 (쉼표로 여러 명 가능)
const SHEET_NAME = '신청서';
const MAX_PER_10MIN = 5;                      // 같은 이메일 주소로 10분 안에 보낼 수 있는 횟수

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // 자동 입력 프로그램이 채우는 보이지 않는 칸 — 값이 있으면 조용히 성공 처리
    if (data.website) return json_({ ok: true });

    const rows = Array.isArray(data.rows) ? data.rows.slice(0, 20) : [];
    const replyTo = clean_(data.replyTo, 120);
    const subject = clean_(data.subject, 150) || '[홈페이지 신청서]';
    const message = clean_(data.message, 4000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(replyTo)) return json_({ ok: false, error: 'email_invalid' });

    // 짧은 시간 반복 전송 막기
    const cache = CacheService.getScriptCache();
    const key = 'n_' + Utilities.base64EncodeWebSafe(replyTo.toLowerCase());
    const n = Number(cache.get(key) || 0);
    if (n >= MAX_PER_10MIN) return json_({ ok: false, error: 'rate_limited' });
    cache.put(key, String(n + 1), 600);

    const pairs = rows
      .filter(function (r) { return Array.isArray(r) && r.length === 2; })
      .map(function (r) { return [clean_(r[0], 60), clean_(r[1], 500)]; });

    // 1) 시트에 기록
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(['접수 일시', '제목', '신청 내용', '문의 내용', '처리 상태', '메모']);
    const when = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    sheet.appendRow([when, cell_(subject), cell_(pairs.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n')), cell_(message), '신규', '']);

    // 2) 이메일 발송 — '답장'을 누르면 신청자에게 갑니다
    const body = pairs.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n') +
      '\n\n내용 / Message:\n' + (message || '(없음 / none)') +
      '\n\n접수 일시: ' + when + ' (한국 시간)\n기록 시트: ' + ss.getUrl();
    MailApp.sendEmail({ to: RECEIVER, replyTo: replyTo, subject: subject, body: body, name: '그린파스처 홈페이지' });

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server_error' });
  }
}

// 브라우저에서 주소를 직접 열었을 때 확인용
function doGet() {
  return json_({ ok: true, service: 'greenpasture-form' });
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').trim().slice(0, max);
}

// 시트에서 = + - @ 로 시작하는 값이 수식으로 실행되지 않게 앞에 ' 를 붙입니다
function cell_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
