/* =========================================================================
 * 주식회사 그린파스처 — 공통 스크립트
 * -------------------------------------------------------------------------
 * 이 파일 하나로 아래 기능을 처리합니다.
 *   1) 회사 기본 정보(연락처·주소 등) — SITE 만 고치면 전 페이지에 반영
 *   2) 메뉴 구성 — NAV_ITEMS 만 고치면 헤더·모바일 메뉴·푸터에 반영
 *   3) 헤더 / 푸터 자동 삽입
 *   4) 한국어 / 영어 전환 (주소 뒤 ?lang=en 으로 영문 링크 공유 가능)
 *   5) 아이콘 자동 삽입 (<i data-icon="phone"></i>)
 *   6) 모바일 메뉴, 드롭다운, 페이지 내 탭 메뉴(스크롤 따라 활성화)
 *   7) 아코디언(FAQ), 분류 필터, 스크롤 등장 효과, 맨 위로 버튼
 *   8) 메인 첫 화면 입자 배경, 메인 최신 소식
 *   9) 검토 모드 — 주소 뒤에 ?review 를 붙이면 "확인 필요" 항목이 노란 점선으로 표시
 * ========================================================================= */

/* =========================================================
 * 1. 회사 기본 정보  ← 연락처·주소가 바뀌면 여기만 수정
 * ========================================================= */
const SITE = {
  nameKo: '주식회사 그린파스처',
  nameEn: 'Green Pasture Co., Ltd.',
  shortKo: '그린파스처',
  shortEn: 'Green Pasture',
  ceoKo: '송창근 · 박건식',
  ceoEn: 'Song Chang-geun · Park Geon-sik',
  tel: '010-3497-2524',
  telEn: '+82 10-3497-2524',     // 해외 방문자용 표기
  telHref: '+821034972524',      // 국내 · 해외 어디서 눌러도 연결되는 국제 형식
  email: 'ceo@greenpasture.co.kr',
  addressKo: '경기도 광주시 곤지암읍 벌열미길 39-14',
  addressEn: '39-14, Beoryeolmi-gil, Gonjiam-eup, Gwangju-si, Gyeonggi-do, Republic of Korea',
  // 응대 시간 · 사업자등록번호 · 설립일은 확인되면 입력하세요. 비어 있으면 공개 화면에 나오지 않습니다.
  hoursKo: '',      // 예: '평일 09:00 – 18:00 (주말 · 공휴일 휴무)'
  hoursEn: '',      // 예: 'Mon–Fri 09:00–18:00 KST (closed weekends & public holidays)'
  bizNo: '',        // 예: '123-45-67890'
  sites: ['www.greenpasture.co.kr', 'www.vzero.co.kr'],
  // SNS 주소를 넣으면 푸터에 아이콘이 나타납니다. 비워두면 표시되지 않습니다.
  sns: {
    instagram: '',
    youtube: '',
    blog: '',       // 네이버 블로그
    facebook: '',
    linkedin: '',
    kakao: ''       // 카카오톡 채널 (예: https://pf.kakao.com/_xxxx)
  }
};

/* =========================================================
 * 2. 메뉴 구성  ← 메뉴를 추가/삭제하려면 이 배열만 수정
 *    header:false 는 상단 메뉴에서 숨기고 푸터·모바일에만 표시합니다.
 * ========================================================= */
const NAV_ITEMS = [
  { href: 'index.html', ko: '홈', en: 'Home', header: false },
  {
    href: 'about.html', ko: '회사 소개', en: 'About',
    children: [
      { href: 'about.html#story',         ko: '브랜드 스토리',   en: 'Brand Story' },
      { href: 'about.html#message',       ko: 'CEO 인사말',     en: 'CEO Message' },
      { href: 'about.html#leadership',    ko: '경영진',         en: 'Leadership' },
      { href: 'about.html#overview',      ko: '회사 개요',       en: 'Company Overview' },
      { href: 'about.html#certification', ko: '인증 · 특허',     en: 'Certifications' },
      { href: 'about.html#location',      ko: '오시는 길',       en: 'Location' }
    ]
  },
  {
    href: 'business.html', ko: '사업 안내', en: 'Business',
    children: [
      { href: 'business.html#technology',   ko: '핵심 기술',       en: 'Technology' },
      { href: 'business.html#products',     ko: '제품 라인업',     en: 'Products' },
      { href: 'business.html#applications', ko: '적용 분야',       en: 'Applications' },
      { href: 'business.html#performance',  ko: '시험 · 실증 데이터', en: 'Test Data' },
      { href: 'business.html#process',      ko: '시공 안내',       en: 'Application Process' },
      { href: 'business.html#partnership',  ko: '파트너십',        en: 'Partnership' }
    ]
  },
  { href: 'news.html',    ko: '공지 · 소식',   en: 'News' },
  { href: 'faq.html',     ko: '자주 묻는 질문', en: 'FAQ' },
  { href: 'apply.html',   ko: '신청 · 예약',   en: 'Request' },
  { href: 'contact.html', ko: '문의하기',      en: 'Contact' }
];

/* =========================================================
 * 3. 아이콘 (인라인 SVG) — HTML에서 <i data-icon="이름"></i> 로 사용
 * ========================================================= */
const S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
const ICON = {
  phone: `<svg ${S}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>`,
  mail: `<svg ${S}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>`,
  pin: `<svg ${S}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: `<svg ${S}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  globe: `<svg ${S}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
  arrow: `<svg class="i-arrow" ${S}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  chevron: `<svg ${S}><path d="m6 9 6 6 6-6"/></svg>`,
  top: `<svg ${S} stroke-width="2"><path d="m6 15 6-6 6 6"/></svg>`,
  search: `<svg ${S}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  link: `<svg ${S}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>`,
  share: `<svg ${S}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>`,
  doc: `<svg ${S}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>`,
  check: `<svg ${S} stroke-width="2.4"><path d="m5 12 5 5 9-10"/></svg>`,
  calendar: `<svg ${S}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`,
  quote: `<svg ${S}><path d="M4 4h16v12H8l-4 4Z"/><path d="M8 9h8M8 12h5"/></svg>`,
  flask: `<svg ${S}><path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7 15h10"/></svg>`,
  handshake: `<svg ${S}><path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a5 5 0 0 1 6 -.8l.4.2a3 3 0 0 0 2 .3L21 4"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1.4 1.4 0 0 0 2-2M3 4h8"/></svg>`,
  box: `<svg ${S}><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>`,
  shield: `<svg ${S}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  sun: `<svg ${S}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon: `<svg ${S}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`,
  flame: `<svg ${S}><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6.5-4-9.5-1 2-2.5 3-4 3 0-2.5-1-4-2-5.5C8 6 5 9 5 15a7 7 0 0 0 7 7Z"/><path d="M12 22a3 3 0 0 1-3-3c0-2 1.5-3 3-4.5 1.5 1.5 3 2.5 3 4.5a3 3 0 0 1-3 3Z"/></svg>`,
  atom: `<svg ${S}><circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>`,
  layers: `<svg ${S}><path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/></svg>`,
  drop: `<svg ${S}><path d="M12 2.7s7 7.3 7 12.3a7 7 0 0 1-14 0c0-5 7-12.3 7-12.3Z"/></svg>`,
  leaf: `<svg ${S}><path d="M11 20A7 7 0 0 1 4 13c0-6 6-10 16-10 0 10-4 17-9 17Z"/><path d="M4 21c3-6 7-9 12-11"/></svg>`,
  timer: `<svg ${S}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>`,
  sparkle: `<svg ${S}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>`,
  virus: `<svg ${S}><circle cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M4.9 4.9l3.5 3.5M15.6 15.6l3.5 3.5M4.9 19.1l3.5-3.5M15.6 8.4l3.5-3.5"/></svg>`,
  wind: `<svg ${S}><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>`,
  cube: `<svg ${S}><path d="M21 16V8l-9-5-9 5v8l9 5Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>`,
  appliance: `<svg ${S}><rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="14" r="3"/><path d="M9 6h6"/></svg>`,
  building: `<svg ${S}><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>`,
  medical: `<svg ${S}><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`,
  car: `<svg ${S}><path d="M5 17h14v-5l-2-5H7l-2 5Z"/><path d="M3 12h18M7 17v2M17 17v2"/><circle cx="8" cy="14.5" r=".5"/><circle cx="16" cy="14.5" r=".5"/></svg>`,
  fabric: `<svg ${S}><path d="M4 4h16v16H4z"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/></svg>`,
  landmark: `<svg ${S}><path d="M3 22h18M5 18h14M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 3 8h18Z"/></svg>`,
  network: `<svg ${S}><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5 6.5 17M12 11.5l5.5 5.5"/></svg>`,
  school: `<svg ${S}><path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>`,
  hotel: `<svg ${S}><path d="M2 20V6M2 16h20M22 20v-8a3 3 0 0 0-3-3h-8v7"/><circle cx="6.5" cy="11.5" r="2"/></svg>`,
  office: `<svg ${S}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18"/></svg>`,
  food: `<svg ${S}><path d="M4 3v8a3 3 0 0 0 3 3v7M7 3v6M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 0-4 2-4 7h4"/></svg>`,
  truck: `<svg ${S}><path d="M2 5h12v11H2zM14 9h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
  gauge: `<svg ${S}><path d="M12 14 16 9"/><path d="M3.5 18a10 10 0 1 1 17 0"/></svg>`,
  spray: `<svg ${S}><path d="M9 11h6v10H9zM10 11V7h4v4M14 7l3-3M18 6h.01M20 4h.01M20 8h.01"/></svg>`,
  // SNS
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 12s0-3.8-.5-5.6a3 3 0 0 0-2.1-2.1C18.6 3.8 12 3.8 12 3.8s-6.6 0-8.4.5a3 3 0 0 0-2.1 2.1C1 8.2 1 12 1 12s0 3.8.5 5.6a3 3 0 0 0 2.1 2.1c1.8.5 8.4.5 8.4.5s6.6 0 8.4-.5a3 3 0 0 0 2.1-2.1C23 15.8 23 12 23 12ZM9.8 15.4V8.6l5.9 3.4-5.9 3.4Z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9V7.2c0-.8.2-1.2 1.4-1.2H17V3h-2.6C11.3 3 10.3 4.5 10.3 7v2H8v3h2.3v9H14v-9h2.7l.3-3H14Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V21h-4z"/></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-5.5L12 20l-2.5-3H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3.2 4v6h1.7V9.9l2.2 3.1h1.7V7h-1.7v3.1L8.9 7Z"/></svg>',
  kakao: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.4 0 .9.1 1.3.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3Z"/></svg>'
};

const SNS_LABEL = {
  instagram: 'Instagram', youtube: 'YouTube', blog: '네이버 블로그 (Naver Blog)',
  facebook: 'Facebook', linkedin: 'LinkedIn', kakao: '카카오톡 채널 (KakaoTalk)'
};

/* 로고 — 원본 로고 파일을 받으면 assets/img/logo-gp.png 를 같은 이름으로 교체하세요 */
function logoHtml() {
  return `
  <a class="brand" href="index.html" aria-label="${SITE.nameKo} 홈" data-ko-label="${SITE.nameKo} 홈" data-en-label="${SITE.nameEn} home">
    <img class="brand__mark" src="assets/img/logo-gp.png" alt="" width="155" height="110">
    <span class="brand__text">
      <span class="brand__ko"><span data-lang="ko">${SITE.shortKo}</span><span data-lang="en">${SITE.shortEn}</span></span>
      <span class="brand__en">Green Pasture Co., Ltd.</span>
    </span>
  </a>`;
}

/* =========================================================
 * 4. 헤더 / 푸터 만들기
 * ========================================================= */
function currentPage() {
  const path = location.pathname.split('/').pop();
  return !path ? 'index.html' : path;
}

function bi(item) {
  return `<span data-lang="ko">${item.ko}</span><span data-lang="en">${item.en}</span>`;
}

function buildHeader() {
  const here = currentPage();
  const items = NAV_ITEMS.filter(function (i) { return i.header !== false; }).map(function (item) {
    const active = item.href === here;
    const sub = item.children
      ? `<div class="nav__sub">${item.children.map(function (c) { return `<a href="${c.href}">${bi(c)}</a>`; }).join('')}</div>`
      : '';
    return `<li class="nav__item${item.children ? ' has-sub' : ''}">
      <a class="nav__link${active ? ' is-active' : ''}" href="${item.href}"${active ? ' aria-current="page"' : ''}>
        ${bi(item)}${item.children ? ICON.chevron : ''}
      </a>${sub}
    </li>`;
  }).join('');

  return `
<header class="site-header" id="siteHeader">
  <div class="wrap">
    ${logoHtml()}
    <nav class="nav" id="mainNav" aria-label="주 메뉴" data-ko-label="주 메뉴" data-en-label="Main menu">
      <ul class="nav__list">${items}</ul>
      <div class="nav__mobile-extra">
        <div class="lang-toggle" role="group" aria-label="언어 선택 / Language" data-ko-label="언어 선택" data-en-label="Language">
          <button type="button" data-set-lang="ko">KOR</button>
          <button type="button" data-set-lang="en">ENG</button>
        </div>
        <a class="btn btn--primary" href="apply.html?type=quote">
          <span data-lang="ko">견적 요청하기</span><span data-lang="en">Request a Quote</span>${ICON.arrow}
        </a>
        <div class="contact">
          <a href="tel:${SITE.telHref}"><span data-lang="ko">${SITE.tel}</span><span data-lang="en">${SITE.telEn}</span></a>
          <a href="mailto:${SITE.email}">${SITE.email}</a>
        </div>
      </div>
    </nav>
    <div class="header__actions">
      <div class="lang-toggle" role="group" aria-label="언어 선택 / Language" data-ko-label="언어 선택" data-en-label="Language">
        <button type="button" data-set-lang="ko">KOR</button>
        <button type="button" data-set-lang="en">ENG</button>
      </div>
      <a class="btn btn--primary btn--sm" href="apply.html?type=quote">
        <span data-lang="ko">견적 요청</span><span data-lang="en">Get a Quote</span>
      </a>
      <button class="nav-toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="mainNav" aria-label="메뉴 열기" data-ko-label="메뉴 열기" data-en-label="Open menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>`;
}

function snsHtml() {
  const keys = Object.keys(SITE.sns).filter(function (k) { return SITE.sns[k]; });
  if (!keys.length) {
    // 주소가 하나도 없으면 공개 화면에는 아무것도 보이지 않고, 검토 모드에서만 자리가 표시됩니다
    return `<div class="sns tbd-only"><span class="sns__pending" data-tbd="SNS 채널 주소(인스타그램 · 유튜브 · 블로그 · 카카오톡 채널 등)를 받으면 site.js 의 SITE.sns 에 입력하세요.">SNS</span></div>`;
  }
  return `<div class="sns">${keys.map(function (k) {
    return `<a href="${SITE.sns[k]}" target="_blank" rel="noopener" aria-label="${SNS_LABEL[k]}" title="${SNS_LABEL[k]}">${ICON[k]}</a>`;
  }).join('')}</div>`;
}

function buildFooter() {
  const year = new Date().getFullYear();
  const menu = NAV_ITEMS.map(function (i) { return `<a href="${i.href}">${bi(i)}</a>`; }).join('');
  const biz = NAV_ITEMS[2].children.map(function (c) { return `<a href="${c.href}">${bi(c)}</a>`; }).join('');

  return `
<footer class="site-footer">
  <div class="wrap footer__top">
    <div class="footer__brand">
      ${logoHtml()}
      <p class="footer__desc">
        <span data-lang="ko">나노 촉매 코팅 V-ZERO로 사람이 숨 쉬고 머무는 공간을 더 깨끗하게 가꾸어 갑니다.</span>
        <span data-lang="en">With V-ZERO nano-catalyst coating, we help keep the spaces where people live and breathe cleaner.</span>
      </p>
      ${snsHtml()}
    </div>
    <div class="footer__col">
      <h4>Menu</h4>
      <nav class="footer__links" aria-label="푸터 메뉴" data-ko-label="푸터 메뉴" data-en-label="Footer menu">${menu}</nav>
    </div>
    <div class="footer__col">
      <h4>Business</h4>
      <nav class="footer__links" aria-label="사업 안내" data-ko-label="사업 안내" data-en-label="Business">${biz}</nav>
    </div>
    <div class="footer__col">
      <h4>Contact</h4>
      <div class="footer__info">
        <span><b>T.</b><a href="tel:${SITE.telHref}"><span data-lang="ko">${SITE.tel}</span><span data-lang="en">${SITE.telEn}</span></a></span>
        <span><b>E.</b><a href="mailto:${SITE.email}">${SITE.email}</a></span>
        <span data-lang="ko"><b>A.</b>${SITE.addressKo}</span>
        <span data-lang="en"><b>A.</b>${SITE.addressEn}</span>
        ${SITE.hoursKo
          ? `<span><span data-lang="ko"><b>H.</b>${SITE.hoursKo}</span><span data-lang="en"><b>H.</b>${SITE.hoursEn || SITE.hoursKo}</span></span>`
          : `<span class="tbd-only" data-tbd="응대 시간을 받으면 site.js 의 SITE.hoursKo · hoursEn 에 입력하세요."><b>H.</b>(응대 시간)</span>`}
        <span><b>W.</b>${SITE.sites.join(' · ')}</span>
      </div>
    </div>
  </div>
  <div class="wrap footer__bottom">
    <p class="footer__biz">
      <span data-lang="ko">${SITE.nameKo}</span><span data-lang="en">${SITE.nameEn}</span>
      <span data-lang="ko">공동대표 ${SITE.ceoKo}</span><span data-lang="en">Co-CEOs ${SITE.ceoEn}</span>
      ${SITE.bizNo
        ? `<span><span data-lang="ko">사업자등록번호</span><span data-lang="en">Business Reg. No.</span> ${SITE.bizNo}</span>`
        : `<span class="tbd-only" data-tbd="사업자등록번호를 받으면 site.js 의 SITE.bizNo 에 입력하세요.">사업자등록번호 (확인 후 기재)</span>`}
      <br>© ${year} ${SITE.nameEn} All rights reserved.
    </p>
    <nav aria-label="정책" data-ko-label="정책" data-en-label="Policies">
      <a class="is-strong" href="privacy.html"><span data-lang="ko">개인정보처리방침</span><span data-lang="en">Privacy Policy</span></a>
      <a href="contact.html"><span data-lang="ko">문의하기</span><span data-lang="en">Contact</span></a>
    </nav>
  </div>
</footer>

<div class="quick">
  <a class="quick__cta" href="contact.html" aria-label="문의하기" data-ko-label="문의하기" data-en-label="Contact us">${ICON.mail}</a>
  <a href="tel:${SITE.telHref}" aria-label="전화 문의" data-ko-label="전화 문의" data-en-label="Call us">${ICON.phone}</a>
  <button type="button" class="quick__top" id="toTop" aria-label="맨 위로" data-ko-label="맨 위로" data-en-label="Back to top">${ICON.top}</button>
</div>`;
}

/* =========================================================
 * 5. 언어 전환
 *    우선순위: 주소의 ?lang= → 이전에 고른 언어 → 한국어
 * ========================================================= */
const LANG_KEY = 'gp-lang';
const PAGE_TITLE_KO = document.title;

function getLang() { return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ko'; }

function setLang(lang, remember) {
  const value = lang === 'en' ? 'en' : 'ko';
  document.documentElement.setAttribute('lang', value);
  if (remember !== false) {
    try { localStorage.setItem(LANG_KEY, value); } catch (e) { /* 저장 불가 환경은 무시 */ }
  }
  document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
    const on = btn.dataset.setLang === value;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  // 제목
  const en = document.querySelector('meta[name="gp:title-en"]');
  document.title = value === 'en' && en ? en.content : PAGE_TITLE_KO;
  // 속성 번역: data-ko-placeholder / data-ko-label(aria-label) / data-ko-alt / data-ko-title
  //           각각 data-en-… 값이 영어 화면에서 쓰입니다
  [['placeholder', 'Placeholder'], ['aria-label', 'Label'], ['alt', 'Alt'], ['title', 'Title']].forEach(function (pair) {
    document.querySelectorAll('[data-ko-' + pair[1].toLowerCase() + ']').forEach(function (el) {
      const ko = el.dataset['ko' + pair[1]];
      const en = el.dataset['en' + pair[1]];
      el.setAttribute(pair[0], value === 'en' ? (en || ko) : ko);
    });
  });
  // <option data-ko="…" data-en="…"> 선택 목록 문구
  document.querySelectorAll('option[data-ko]').forEach(function (opt) {
    opt.textContent = value === 'en' ? (opt.dataset.en || opt.dataset.ko) : opt.dataset.ko;
  });
  document.dispatchEvent(new CustomEvent('gp:lang', { detail: value }));
}

function initLang() {
  let lang = 'ko';
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'ko') {
    lang = q;
  } else {
    try { lang = localStorage.getItem(LANG_KEY) || 'ko'; } catch (e) { /* 무시 */ }
  }
  setLang(lang, q ? true : false);
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-set-lang]');
    if (!btn) return;
    setLang(btn.dataset.setLang);
    // 주소에 ?lang= 이 있으면 함께 바꿔서, 복사한 링크가 고른 언어로 열리게 합니다
    const url = new URL(location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', btn.dataset.setLang);
      history.replaceState(null, '', url);
    }
  });
}

/* =========================================================
 * 6. 아이콘 자동 삽입
 * ========================================================= */
function initIcons(root) {
  (root || document).querySelectorAll('i[data-icon]').forEach(function (el) {
    const svg = ICON[el.dataset.icon];
    if (!svg) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = svg.trim();
    const node = tpl.content.firstElementChild;
    el.className.split(/\s+/).filter(Boolean).forEach(function (c) { node.classList.add(c); });
    el.replaceWith(node);
  });
}

/* =========================================================
 * 7. 모바일 메뉴 · 드롭다운
 * ========================================================= */
function initNav() {
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;
  const mobile = window.matchMedia('(max-width: 1024px)');

  function setOpen(open) {
    const en = getLang() === 'en';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.dataset.koLabel = open ? '메뉴 닫기' : '메뉴 열기';
    toggle.dataset.enLabel = open ? 'Close menu' : 'Open menu';
    toggle.setAttribute('aria-label', en ? toggle.dataset.enLabel : toggle.dataset.koLabel);
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  }
  toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });

  nav.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;
    const item = link.parentElement;
    // 모바일: 하위 메뉴가 있는 항목은 첫 번째 탭에서 펼치기만 합니다
    if (mobile.matches && link.classList.contains('nav__link') && item.classList.contains('has-sub') && !item.classList.contains('is-expanded')) {
      e.preventDefault();
      nav.querySelectorAll('.nav__item.is-expanded').forEach(function (i) { i.classList.remove('is-expanded'); });
      item.classList.add('is-expanded');
      return;
    }
    if (mobile.matches) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  mobile.addEventListener('change', function () { if (!mobile.matches) setOpen(false); });
}

/* =========================================================
 * 8. 헤더 배경 · 진행 막대 · 맨 위로 버튼
 * ========================================================= */
function initScrollUI() {
  const header = document.getElementById('siteHeader');
  const toTop = document.getElementById('toTop');
  const quick = document.querySelector('.quick');
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);

  let ticking = false;
  function update() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 10);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
    if (quick) quick.classList.toggle('is-shown', y > 360);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();

  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

/* =========================================================
 * 9. 스크롤 등장 효과
 * ========================================================= */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  items.forEach(function (el) { io.observe(el); });
}

/* =========================================================
 * 10. 아코디언 (FAQ)
 * ========================================================= */
function initAccordion() {
  document.querySelectorAll('.acc__btn').forEach(function (btn, i) {
    const item = btn.closest('.acc');
    const panel = item.querySelector('.acc__panel');
    if (panel && !panel.id) panel.id = 'acc-panel-' + i;
    btn.setAttribute('aria-controls', panel ? panel.id : '');
    btn.setAttribute('aria-expanded', String(item.classList.contains('is-open')));
    btn.addEventListener('click', function () {
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

/* =========================================================
 * 11. 분류 필터 — <div data-filter-group data-target="#faqList">
 *     안의 [data-filter] 버튼으로 대상 안의 [data-cat] 항목을 거릅니다
 * ========================================================= */
function initFilters() {
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    const target = document.querySelector(group.dataset.target);
    if (!target) return;
    group.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      group.querySelectorAll('[data-filter]').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const f = btn.dataset.filter;
      target.querySelectorAll('[data-cat]').forEach(function (row) {
        row.hidden = !(f === 'all' || row.dataset.cat === f);
      });
    });
  });
}

/* =========================================================
 * 12. 페이지 내 탭 메뉴 — 지금 보고 있는 구역을 표시
 * ========================================================= */
function initSubnav() {
  const links = Array.from(document.querySelectorAll('.subnav a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;
  const map = new Map();
  links.forEach(function (a) {
    const sec = document.getElementById(a.getAttribute('href').slice(1));
    if (sec) map.set(sec, a);
  });
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (a) { a.classList.remove('is-active'); });
      const a = map.get(entry.target);
      if (a) {
        a.classList.add('is-active');
        // 탭 줄만 가로로 옮깁니다. (scrollIntoView 는 페이지 전체 스크롤을 끊어 먹어서 쓰지 않습니다)
        const list = a.parentElement;
        if (list && list.scrollWidth > list.clientWidth) {
          const lr = list.getBoundingClientRect(), ar = a.getBoundingClientRect();
          const left = list.scrollLeft + (ar.left - lr.left) - (lr.width - ar.width) / 2;
          list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
        }
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach(function (_, sec) { io.observe(sec); });
}

/* =========================================================
 * 12-B. 지도 — 페이지를 스크롤하다 지도에 걸려 멈추지 않도록
 *       처음에는 덮개를 씌워 두고, 누르면 지도를 움직일 수 있게 합니다
 * ========================================================= */
function initMaps() {
  document.querySelectorAll('.map__frame').forEach(function (frame) {
    if (frame.querySelector('.map__shield')) return;
    const shield = document.createElement('button');
    shield.type = 'button';
    shield.className = 'map__shield';
    shield.innerHTML = '<span><span data-lang="ko">눌러서 지도 움직이기</span><span data-lang="en">Tap to use the map</span></span>';
    shield.addEventListener('click', function () { frame.classList.add('is-active'); });
    frame.appendChild(shield);
    frame.addEventListener('mouseleave', function () { frame.classList.remove('is-active'); });
    document.addEventListener('touchstart', function (e) {
      if (!frame.contains(e.target)) frame.classList.remove('is-active');
    }, { passive: true });
  });
}

/* =========================================================
 * 13. 메인 첫 화면 — 입자 네트워크 배경 (브로슈어의 별빛 연결망)
 * ========================================================= */
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = 1, points = [], running = true, raf = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, Math.max(36, (w * h) / 16000)));
    points = [];
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.4, t: Math.random() * Math.PI * 2
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const link = Math.min(150, w / 7);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!reduce) {
        p.x += p.vx; p.y += p.vy; p.t += 0.02;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
      }
      for (let j = i + 1; j < points.length; j++) {
        const q = points[j];
        const dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < link) {
          ctx.strokeStyle = 'rgba(125, 211, 252,' + (0.16 * (1 - d / link)).toFixed(3) + ')';
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      const a = 0.45 + Math.sin(p.t) * 0.3;
      ctx.fillStyle = 'rgba(186, 230, 253,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    if (running && !reduce) raf = requestAnimationFrame(draw);
  }

  resize(); draw();
  let rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { resize(); if (reduce) draw(); }, 150); });
  // 화면에서 벗어나면 멈춰서 배터리를 아낍니다
  if ('IntersectionObserver' in window && !reduce) {
    new IntersectionObserver(function (entries) {
      const vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; raf = requestAnimationFrame(draw); }
      if (!vis) { running = false; cancelAnimationFrame(raf); }
    }).observe(canvas);
  }
}

/* =========================================================
 * 14. 메인 최신 소식 (assets/data/posts.js 의 글 3개)
 * ========================================================= */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function initNewsTeaser() {
  const box = document.getElementById('newsTeaser');
  if (!box || !window.GP_POSTS) return;
  const cats = window.GP_POST_CATEGORIES || {};
  const posts = window.GP_POSTS.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 3);
  box.innerHTML = posts.map(function (p) {
    const c = cats[p.category] || { ko: p.category, en: p.category };
    return `<a class="news-card reveal" href="news.html?id=${encodeURIComponent(p.id)}">
      <span class="badge news-card__cat">${bi(c)}</span>
      <h3><span data-lang="ko">${escapeHtml(p.title.ko)}</span><span data-lang="en">${escapeHtml(p.title.en)}</span></h3>
      <p><span data-lang="ko">${escapeHtml(p.summary.ko)}</span><span data-lang="en">${escapeHtml(p.summary.en)}</span></p>
      <time datetime="${p.date}">${p.date.replace(/-/g, '.')}</time>
    </a>`;
  }).join('');
}

/* =========================================================
 * 15. 검토 모드 — 주소 뒤에 ?review 를 붙이면 켜지고 ?review=0 이면 꺼집니다
 *     data-tbd="메모" 가 달린 곳이 "고객 확인이 필요한 내용"입니다.
 * ========================================================= */
function initReview() {
  const KEY = 'gp-review';
  const params = new URLSearchParams(location.search);
  let on = false;
  try {
    if (params.has('review')) localStorage.setItem(KEY, params.get('review') === '0' ? '0' : '1');
    on = localStorage.getItem(KEY) === '1';
  } catch (e) { on = params.has('review') && params.get('review') !== '0'; }
  if (!on) return;

  document.documentElement.classList.add('is-review');
  const bar = document.createElement('div');
  bar.className = 'review-bar';
  bar.setAttribute('role', 'status');
  document.body.appendChild(bar);
  let idx = -1;

  function visibleItems() {
    return Array.from(document.querySelectorAll('[data-tbd]')).filter(function (el) { return el.getClientRects().length > 0; });
  }
  function render(note) {
    const n = visibleItems().length;
    bar.innerHTML = `<b>검토 모드</b> · 이 페이지에 확인이 필요한 항목 <b>${n}</b>개
      ${note ? `<div class="review-bar__note">${escapeHtml(note)}</div>` : ''}
      <div class="review-bar__row">
        <button type="button" data-rv="next">다음 항목 보기</button>
        <button type="button" data-rv="off">검토 모드 끄기</button>
      </div>`;
  }
  bar.addEventListener('click', function (e) {
    const b = e.target.closest('[data-rv]');
    if (!b) return;
    if (b.dataset.rv === 'off') {
      try { localStorage.setItem(KEY, '0'); } catch (err) { /* 무시 */ }
      document.documentElement.classList.remove('is-review');
      bar.remove();
      return;
    }
    const items = visibleItems();
    if (!items.length) return;
    idx = (idx + 1) % items.length;
    const el = items[idx];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('review-flash'); void el.offsetWidth; el.classList.add('review-flash');
    render(`(${idx + 1}/${items.length}) ${el.dataset.tbd || '내용 확인 필요'}`);
  });
  document.addEventListener('mouseover', function (e) {
    const el = e.target.closest('[data-tbd]');
    if (el && el.dataset.tbd && !el.title) el.title = '확인 필요: ' + el.dataset.tbd;
  });
  document.addEventListener('gp:lang', function () { render(); });
  render();
}

/* =========================================================
 * 16. 실행
 * ========================================================= */
document.documentElement.classList.remove('no-js');
document.addEventListener('DOMContentLoaded', function () {
  const headerSlot = document.getElementById('header-slot');
  const footerSlot = document.getElementById('footer-slot');
  if (headerSlot) headerSlot.outerHTML = buildHeader();
  if (footerSlot) footerSlot.outerHTML = buildFooter();

  initNewsTeaser();
  initIcons();
  initLang();
  initNav();
  initScrollUI();
  initReveal();
  initAccordion();
  initFilters();
  initSubnav();
  initMaps();
  initHeroCanvas();
  initReview();
});
