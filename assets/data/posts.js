/* =========================================================================
 * 공지 · 소식 게시글
 * -------------------------------------------------------------------------
 * 새 글을 올리려면 아래 GP_POSTS 배열 "맨 위"에 한 덩어리를 복사해 붙이고
 * 내용만 바꾸면 됩니다. 저장하면 게시판·메인 화면에 자동으로 반영됩니다.
 *
 *   id       : 글 주소에 쓰이는 영문 이름 (겹치지 않게, 띄어쓰기 대신 - 사용)
 *   category : notice(공지사항) / news(회사 소식) / tech(기술 · 자료) / press(보도자료)
 *   date     : 게시일 (YYYY-MM-DD)
 *   pinned   : true 면 목록 맨 위에 고정
 *   title / summary / body : ko(한국어) · en(영어). body 는 HTML 로 작성
 *
 * ※ body 에는 직접 작성한 HTML만 넣으세요. 외부에서 복사한 스크립트는 넣지 마십시오.
 * ========================================================================= */

window.GP_POST_CATEGORIES = {
  notice: { ko: '공지사항', en: 'Notice' },
  news:   { ko: '회사 소식', en: 'Company News' },
  tech:   { ko: '기술 · 자료', en: 'Technology' },
  press:  { ko: '보도자료', en: 'Press' }
};

window.GP_POSTS = [
  {
    id: 'website-open',
    category: 'notice',
    date: '2026-09-30',
    pinned: true,
    title: {
      ko: '그린파스처 홈페이지를 새롭게 열었습니다',
      en: 'Our new website is now open'
    },
    summary: {
      ko: 'V-ZERO 기술과 제품, 적용 분야, 견적·샘플·시공 상담 신청을 한곳에서 확인하실 수 있습니다.',
      en: 'Explore V-ZERO technology, products and applications, and request quotes, samples or on-site consultations in one place.'
    },
    body: {
      ko: `
<p>안녕하십니까. 주식회사 그린파스처입니다.</p>
<p>나노 촉매 코팅 <strong>V-ZERO</strong>를 더 많은 분께 정확하게 소개하기 위해 홈페이지를 새롭게 열었습니다.</p>
<h3>홈페이지에서 확인하실 수 있는 내용</h3>
<ul>
  <li><a href="business.html#technology">핵심 기술</a> — 가시광 · 무광(암촉매) · 열촉매 3중 작동 원리</li>
  <li><a href="business.html#products">제품 라인업</a> — 오리지널 원액, 프리미엄 에어 필터, 안심 시공 케어</li>
  <li><a href="business.html#performance">시험 · 실증 데이터</a> — 항균 · 항바이러스 · 탈취 시험 결과 요약</li>
  <li><a href="apply.html">신청 · 예약</a> — 견적 요청, 샘플 신청, 시공 상담 · 현장 방문 예약, 파트너 신청</li>
</ul>
<p>궁금하신 점은 <a href="contact.html">문의하기</a>에 남겨 주시면 담당자가 확인 후 연락드리겠습니다.</p>
<p>감사합니다.</p>`,
      en: `
<p>Thank you for visiting Green Pasture Co., Ltd.</p>
<p>We have launched our new website to introduce <strong>V-ZERO</strong>, our nano-catalyst coating, more clearly to customers and partners.</p>
<h3>What you can find here</h3>
<ul>
  <li><a href="business.html#technology">Technology</a> — how visible-light, lightless (dark) and thermal catalysis work together</li>
  <li><a href="business.html#products">Products</a> — Original solution, Premium air filter, and Professional coating care</li>
  <li><a href="business.html#performance">Test data</a> — a summary of antibacterial, antiviral and deodorization tests</li>
  <li><a href="apply.html">Requests</a> — quotes, samples, on-site consultations and partnership applications</li>
</ul>
<p>If you have any questions, please leave a message on our <a href="contact.html">contact page</a>.</p>`
    }
  },
  {
    id: 'partner-recruit',
    category: 'notice',
    date: '2026-09-30',
    pinned: false,
    title: {
      ko: '7대 산업생태계별 V-ZERO 파트너를 모집합니다',
      en: 'Now recruiting V-ZERO partners across seven industries'
    },
    summary: {
      ko: '생활가전, 건설자재, 병원·의료, 모빌리티, 소재 코팅, 공공조달, 글로벌 B2B 분야에서 함께할 파트너를 찾습니다.',
      en: 'We are looking for partners in home appliances, construction materials, healthcare, mobility, material coating, public procurement and global B2B.'
    },
    body: {
      ko: `
<p>그린파스처는 V-ZERO 나노 촉매 기술로 비즈니스의 영토를 함께 넓혀갈 <strong>산업별 파트너</strong>를 모십니다.</p>
<h3>모집 분야</h3>
<ol>
  <li><strong>생활가전</strong> — 공기청정기 · 에어컨 · 의류관리기 등의 필터와 내부 부품 적용</li>
  <li><strong>건설자재</strong> — 벽지 · 바닥재 · 페인트 · 환기 시스템 등 마감재 적용</li>
  <li><strong>병원 · 의료</strong> — 병동 · 수술실 · 요양시설 표면과 의료기기 표면 시공</li>
  <li><strong>자동차 · 모빌리티</strong> — 공조 필터, 시트 · 핸들 등 다중이용 모빌리티 내장재</li>
  <li><strong>섬유 · 플라스틱 · 목재 · 금속</strong> — 소재 나노코팅, 화장품 용기 · 뷰티 디바이스</li>
  <li><strong>공공조달</strong> — 학교 · 지하철 · 관공서 등 공공시설 위생 관리</li>
  <li><strong>글로벌 B2B 네트워크</strong> — 해외 대리점 · 에이전트</li>
</ol>
<p>대리점 · 시공점 · OEM 공급 등 협력 형태는 분야와 지역에 따라 협의합니다.</p>
<p><a class="btn btn--primary" href="apply.html?type=partner">파트너 신청하기</a></p>`,
      en: `
<p>Green Pasture is looking for <strong>industry partners</strong> to grow together with V-ZERO nano-catalyst technology.</p>
<h3>Partnership areas</h3>
<ol>
  <li><strong>Home appliances</strong> — filters and internal parts of air purifiers, air conditioners and clothing care</li>
  <li><strong>Construction materials</strong> — wallpaper, flooring, paint and ventilation systems</li>
  <li><strong>Healthcare</strong> — surfaces in wards, operating rooms and care facilities, and medical device surfaces</li>
  <li><strong>Automotive &amp; mobility</strong> — HVAC filters, seats and steering wheels in shared mobility</li>
  <li><strong>Textiles, plastics, wood &amp; metals</strong> — material coating, cosmetic containers and beauty devices</li>
  <li><strong>Public procurement</strong> — hygiene management for schools, subways and public buildings</li>
  <li><strong>Global B2B network</strong> — overseas distributors and agents</li>
</ol>
<p>Distribution, applicator and OEM supply terms are discussed by sector and region.</p>
<p><a class="btn btn--primary" href="apply.html?type=partner">Apply for partnership</a></p>`
    }
  },
  {
    id: 'catalog-guide',
    category: 'tech',
    date: '2026-09-30',
    pinned: false,
    title: {
      ko: 'V-ZERO 제품 카탈로그 · 시공 가이드 자료 요청 안내',
      en: 'How to request the V-ZERO catalog & application guide'
    },
    summary: {
      ko: '제품 개요, 기술 원리, 성능 실증 데이터, 기재별 시공 기준을 담은 자료를 요청하실 수 있습니다.',
      en: 'Request our materials covering product overview, technology, test data and application standards by substrate.'
    },
    body: {
      ko: `
<p>V-ZERO 도입을 검토하시는 기업 · 기관 담당자분께 <strong>제품 카탈로그 & 시공 가이드</strong>를 제공합니다.</p>
<h3>자료 구성</h3>
<ul>
  <li>제품 개요 및 핵심 사양</li>
  <li>기술 원리 — 가시광 · 무광 · 열촉매 3중 활성산소(ROS) 메커니즘</li>
  <li>무기 나노바인더 원천기술 (SNB 기술)</li>
  <li>성능 실증 데이터 — 항균 · 항바이러스 · 탈취, ATP 오염도 측정</li>
  <li>적용 분야별 활용 예시</li>
  <li>시공 사전 준비, 공정 흐름, 기재별 시공 기준표</li>
  <li>품질 확인 — 표면저항 측정 방법</li>
  <li>보관 방법 · 주의사항 · FAQ, 시험 결과 및 관련 특허</li>
</ul>
<p>자료는 요청하신 이메일로 보내드립니다. 시험성적서 원본이 필요하시면 요청 내용에 함께 적어 주십시오.</p>
<p><a class="btn btn--primary" href="apply.html?type=catalog">자료 요청하기</a></p>`,
      en: `
<p>For companies and institutions considering V-ZERO, we provide our <strong>Product Catalog &amp; Application Guide</strong>.</p>
<h3>Contents</h3>
<ul>
  <li>Product overview and key specifications</li>
  <li>Technology — visible-light, lightless and thermal catalysis (triple ROS mechanism)</li>
  <li>Inorganic nano-binder technology (SNB)</li>
  <li>Test data — antibacterial, antiviral, deodorization and ATP contamination measurements</li>
  <li>Application examples by sector</li>
  <li>Preparation, process flow and application standards by substrate</li>
  <li>Quality check — surface resistance measurement</li>
  <li>Storage, precautions, FAQ, test results and related patents</li>
</ul>
<p>We will send the materials to your e-mail. If you need original test reports, please mention it in your request.</p>
<p><a class="btn btn--primary" href="apply.html?type=catalog">Request materials</a></p>`
    }
  },
  {
    id: 'three-way-catalyst',
    category: 'tech',
    date: '2026-09-30',
    pinned: false,
    title: {
      ko: '빛이 없어도 작동하는 이유 — V-ZERO 3중 촉매 원리',
      en: 'Why V-ZERO keeps working in the dark — the triple catalyst'
    },
    summary: {
      ko: '자외선에서만 작동하던 기존 광촉매와 달리, V-ZERO는 실내조명 · 암소 · 열의 세 경로로 작동하도록 설계되었습니다.',
      en: 'Unlike conventional UV-only photocatalysts, V-ZERO is designed to work through indoor light, darkness and heat.'
    },
    body: {
      ko: `
<p>기존 산화티타늄(TiO₂) 광촉매는 주로 <strong>자외선(UV)</strong>이 있어야 작동했습니다. 실내조명 아래나 밤에는 효과를 기대하기 어려웠던 이유입니다.</p>
<p>V-ZERO는 산화텅스텐(WO₃)을 중심으로 나노 백금(Nano-Pt), 실리카(SiO₂) 등을 조합해 <strong>세 가지 경로</strong>로 작동하도록 설계되었습니다.</p>
<ol>
  <li><strong>가시광 촉매</strong> — 일반 실내조명(약 500lux) 수준의 빛으로 활성산소(ROS)를 만듭니다.</li>
  <li><strong>무광 촉매(암촉매)</strong> — 나노 백금이 빛이 없는 환경에서도 공기 중 산소 · 수분과 반응하도록 설계되었습니다.</li>
  <li><strong>열촉매</strong> — 온도 조건에 따라 일산화탄소 등 유해가스의 산화 반응을 돕습니다.</li>
</ol>
<p>이렇게 만들어진 활성산소는 표면에 닿은 세균 · 바이러스 · 냄새 분자를 산화 분해하는 방식으로 작용합니다.</p>
<p class="tiny">※ 제조사 기술 자료를 요약한 내용이며, 실제 효과는 사용 환경(조도 · 온도 · 습도 · 오염도)에 따라 다를 수 있습니다.</p>
<p><a class="btn btn--primary" href="business.html#technology">기술 자세히 보기</a></p>`,
      en: `
<p>Conventional titanium dioxide (TiO₂) photocatalysts mainly require <strong>ultraviolet (UV) light</strong>, which is why they work poorly under indoor lighting or at night.</p>
<p>V-ZERO combines tungsten trioxide (WO₃) with nano-platinum (Nano-Pt), silica (SiO₂) and other components, and is designed to work through <strong>three pathways</strong>.</p>
<ol>
  <li><strong>Visible-light catalysis</strong> — generates reactive oxygen species (ROS) under ordinary indoor lighting (approx. 500 lux).</li>
  <li><strong>Lightless (dark) catalysis</strong> — nano-platinum is designed to react with oxygen and moisture in the air even without light.</li>
  <li><strong>Thermal catalysis</strong> — assists the oxidation of harmful gases such as carbon monoxide under suitable temperatures.</li>
</ol>
<p>The resulting ROS act by oxidizing bacteria, viruses and odor molecules that come into contact with the surface.</p>
<p class="tiny">* Summary of the manufacturer's technical materials. Actual performance may vary with the environment (light, temperature, humidity, contamination).</p>
<p><a class="btn btn--primary" href="business.html#technology">Learn more about the technology</a></p>`
    }
  }
];
