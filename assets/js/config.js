/* ============================================================
   주식회사 그린파스처 · 온라인 접수 연결 설정
   ------------------------------------------------------------
   여기 값들은 브라우저에 그대로 노출되는 "공개 값"입니다.
   저장소에 올라가도 안전합니다. (비밀 키는 절대 여기 두지 마십시오)

   ▸ 문의 · 신청 양식은 아래 순서로 접수 방식을 고릅니다.
       1) SUPABASE_URL 이 있으면 → Supabase 데이터베이스 (docs/SETUP.md)
       2) 없고 SHEET_URL 이 있으면 → 구글 시트 (docs/GOOGLE-SHEET.md)
       3) 둘 다 비어 있으면 → 방문자의 메일 앱을 열어 FALLBACK_EMAIL 로 보내도록 안내
   ============================================================ */
window.GP_CONFIG = {
  /* 구글 시트 접수 주소 (Apps Script 웹 앱 배포 주소).
     예: https://script.google.com/macros/s/AKfy..../exec */
  SHEET_URL: "",

  /* Supabase 프로젝트 주소. 예: https://abcdefgh.supabase.co */
  SUPABASE_URL: "",

  /* 공개(anon) 키. 대시보드 > Project Settings > API Keys */
  SUPABASE_ANON_KEY: "",

  /* 접수 함수 이름 — 바꾸지 마십시오 */
  SUBMIT_FUNCTION: "submit-inquiry",

  /* Cloudflare Turnstile 사이트 키. 비워두면 캡차 없이 동작합니다. */
  TURNSTILE_SITE_KEY: "",

  /* 온라인 접수가 연결되기 전, 메일로 받을 주소 */
  FALLBACK_EMAIL: "ceo@greenpasture.co.kr",

  /* 접수 실패 시 안내할 전화번호 */
  TEL: "010-3497-2524",
};
