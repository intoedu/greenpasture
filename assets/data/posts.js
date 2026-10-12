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
      en: 'Find V-ZERO technology, products and applications, and apply for quotes, samples or application consultations, all in one place.'
    },
    body: {
      ko: `
<p>안녕하십니까. 주식회사 그린파스처입니다.</p>
<p>촉매 코팅 <strong>V-ZERO</strong>를 더 많은 분께 정확하게 소개하기 위해 홈페이지를 새롭게 열었습니다.</p>
<h3>홈페이지에서 확인하실 수 있는 내용</h3>
<ul>
  <li><a href="business.html#technology">핵심 기술</a> — 가시광 · 무광(암촉매) · 열촉매 3중 작동 원리</li>
  <li><a href="business.html#products">제품 라인업</a> — 오리지널 원액, 프리미엄 에어 필터(해외용), 안심 시공 케어</li>
  <li><a href="business.html#performance">시험 · 실증 데이터</a> — 항균 · 항바이러스 · 탈취 시험 결과 요약</li>
  <li><a href="apply.html">신청 · 예약</a> — 견적 요청, 샘플 신청, 시공 상담 · 방문 예약, 파트너 신청</li>
</ul>
<p>궁금하신 점은 <a href="contact.html">문의하기</a>에 남겨 주시면 담당자가 확인 후 연락드리겠습니다.</p>
<p>감사합니다.</p>`,
      en: `
<p>Thank you for visiting Green Pasture Co., Ltd.</p>
<p>We have launched our new website to introduce <strong>V-ZERO</strong>, our catalyst coating, accurately to more people.</p>
<h3>What you can find here</h3>
<ul>
  <li><a href="business.html#technology">Technology</a> — how visible-light, lightless (dark) and thermal catalysis work together</li>
  <li><a href="business.html#products">Products</a> — Original Solution, Premium Air Filter (overseas) and Safe Application Care</li>
  <li><a href="business.html#performance">Test data</a> — a summary of antibacterial, antiviral and deodorization tests</li>
  <li><a href="apply.html">Requests</a> — quote requests, sample requests, consultation / visit bookings and partnership applications</li>
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
      ko: '7대 산업생태계별 파트너를 모십니다',
      en: 'We welcome partners in seven industrial ecosystems'
    },
    summary: {
      ko: '(주)그린파스처와 함께 비즈니스의 영토를 넓혀갈 7대 산업생태계별 파트너를 모십니다.',
      en: 'We welcome partners in seven industrial ecosystems to expand the territory of business together with Green Pasture Co., Ltd.'
    },
    body: {
      ko: `
<p>(주)그린파스처와 함께 비즈니스의 영토를 넓혀갈 <strong>7대 산업생태계별 파트너</strong>를 모십니다.</p>
<h3>모집 분야</h3>
<ol>
  <li><strong>생활 가전 (Home Appliances)</strong> — 공기청정기, 에어컨, 의류관리기 등 필수 생활가전의 필터 및 내부 팬</li>
  <li><strong>건설 자재 (Construction Materials)</strong> — 벽지, 바닥재, 페인트, 환기 시스템(전열교환기) 등 건축 마감재</li>
  <li><strong>병원 의료 (Medical &amp; Healthcare)</strong> — 음압병동, 수술실, 요양원 내부 벽면 및 의료기기 표면</li>
  <li><strong>자동차 모빌리티 (Automotive Mobility)</strong> — 전기차 및 자율주행차의 공조 시스템 필터, 카셰어링 등 다중이용 모빌리티의 시트와 핸들</li>
  <li><strong>섬유, 플라스틱, 목재, 금속류 코팅 (Textiles, Plastics, Wood &amp; Metals)</strong> — 화장품 용기 내부 코팅 및 뷰티 디바이스</li>
  <li><strong>공공 조달 (Public Procurement)</strong> — 학교, 지하철, 관공서 등 공공 건축물의 미세먼지 및 바이러스 저감 사업</li>
  <li><strong>BNI World Network 76 (Global B2B Network)</strong> — 국내외 76개국 네트워크의 각 분야(가전, 건설, 유통 등)</li>
</ol>
<p><a class="btn btn--primary" href="apply.html?type=partner">파트너 신청하기</a></p>`,
      en: `
<p>We welcome <strong>partners in seven industrial ecosystems</strong> to expand the territory of business together with Green Pasture Co., Ltd.</p>
<h3>Partnership areas</h3>
<ol>
  <li><strong>Home Appliances</strong> — filters and internal fans of essential home appliances such as air purifiers, air conditioners and clothing care machines</li>
  <li><strong>Construction Materials</strong> — building finishing materials such as wallpaper, flooring, paint and ventilation systems (heat recovery ventilators)</li>
  <li><strong>Medical &amp; Healthcare</strong> — interior walls of negative-pressure wards, operating rooms and nursing homes, and medical device surfaces</li>
  <li><strong>Automotive Mobility</strong> — air-conditioning system filters of electric and autonomous vehicles, and seats and steering wheels of shared mobility such as car sharing</li>
  <li><strong>Textiles, Plastics, Wood &amp; Metals</strong> — interior coating of cosmetic containers and beauty devices</li>
  <li><strong>Public Procurement</strong> — fine dust and virus reduction projects for public buildings such as schools, subways and government offices</li>
  <li><strong>BNI World Network 76 (Global B2B Network)</strong> — each field (appliances, construction, distribution, etc.) of the network across 76 countries in Korea and abroad</li>
</ol>
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
<p>V-ZERO 도입을 검토하시는 기업 · 기관 담당자분은 <strong>제품 카탈로그 & 시공 가이드</strong>를 자료 요청에서 신청하실 수 있습니다.</p>
<h3>자료 구성</h3>
<ul>
  <li>제품 개요 및 핵심 스펙</li>
  <li>기술 원리 — 가시광 · 무광 · 열촉매 3중 ROS</li>
  <li>무기 바인더 원천기술 (SNB 기술)</li>
  <li>성능 실증 데이터 — 항균 · 항바이러스 · 탈취</li>
  <li>ATP 오염도 측정 — 투석시설 시공 사례</li>
  <li>경쟁 제품 비교</li>
  <li>적용 분야별 활용</li>
  <li>시공 사전 준비 — 자재 · 도구 · 환경</li>
  <li>시공 공정 흐름</li>
  <li>STEP별 시공 절차 (상세)</li>
  <li>기재별 시공 기준표</li>
  <li>품질 확인 — 표면저항 측정</li>
  <li>보관 방법 · 주의사항 · FAQ</li>
  <li>안전성 인증 및 특허 포트폴리오</li>
</ul>
<p><a class="btn btn--primary" href="apply.html?type=catalog">자료 요청하기</a></p>`,
      en: `
<p>Companies and institutions considering V-ZERO can apply for our <strong>Product Catalog &amp; Application Guide</strong> through the materials request.</p>
<h3>Contents</h3>
<ul>
  <li>Product overview and key specifications</li>
  <li>Technology — visible-light, lightless and thermal catalysis: triple ROS</li>
  <li>Inorganic binder core technology (SNB technology)</li>
  <li>Performance data — antibacterial, antiviral, deodorization</li>
  <li>ATP contamination measurement — dialysis facility application case</li>
  <li>Competitive product comparison</li>
  <li>Applications by field</li>
  <li>Pre-application preparation — materials, tools, environment</li>
  <li>Application process flow</li>
  <li>Step-by-step application procedure (detailed)</li>
  <li>Application standards by substrate</li>
  <li>Quality check — surface resistance measurement</li>
  <li>Storage, precautions and FAQ</li>
  <li>Safety certifications and patent portfolio</li>
</ul>
<p><a class="btn btn--primary" href="apply.html?type=catalog">Request materials</a></p>`
    }
  },
  {
    id: 'three-way-catalyst',
    category: 'tech',
    date: '2026-09-30',
    pinned: false,
    title: {
      ko: 'V-ZERO 기술 원리 — 가시광 · 무광 · 열촉매 3중 ROS 활성 메커니즘',
      en: 'V-ZERO technology — the visible-light, lightless and thermal catalyst triple ROS activation mechanism'
    },
    summary: {
      ko: '기존 광촉매는 자외선(UV) 전용이나 V-ZERO는 가시광 · 무광 · 열 3중 경로로 실내 조명(500lux)에서도 작동합니다.',
      en: 'Conventional photocatalysts work only under ultraviolet (UV) light, but V-ZERO works through three pathways — visible light, lightless and thermal — even under indoor lighting (500 lux).'
    },
    body: {
      ko: `
<p>기존 광촉매는 <strong>자외선 전용</strong>으로, 실내 조명(형광등/LED) 하에서는 작동 불가합니다.</p>
<p>V-ZERO는 <strong>3중 경로</strong>가 동시 작동합니다.</p>
<ol>
  <li><strong>가시광(실내 500lux)</strong> — 실내 조명만으로 강력한 촉매 활성화.</li>
  <li><strong>무광 · 암촉매(암소 24h)</strong> — 빛 에너지가 전혀 없는 암소 환경에서도 공기 중의 산소(O₂) 및 수분과 직접 상호작용하여 슈퍼옥사이드 라디칼을 지속적으로 생성합니다.</li>
  <li><strong>열촉매</strong> — 온도와 시간의 상승에 따라 CO(일산화탄소) 분해 능력이 향상됨(CO 분해 시험, 시료 PTVTUA 성능향상품).</li>
</ol>
<p>V-ZERO는 유해 물질이 촉매 표면에 접촉하는 즉시 분자 구조를 완전히 파괴하여 무력화(ZERO)시킵니다.</p>
<p class="tiny">※ 실제 효과는 사용 환경(조도 · 온도 · 습도 · 오염도)에 따라 다를 수 있습니다.</p>
<p><a class="btn btn--primary" href="business.html#technology">기술 자세히 보기</a></p>`,
      en: `
<p>Conventional photocatalysts work <strong>only under ultraviolet light</strong> and cannot operate under indoor lighting (fluorescent/LED).</p>
<p>V-ZERO works through <strong>three pathways</strong> simultaneously.</p>
<ol>
  <li><strong>Visible light (indoor 500 lux)</strong> — strong catalytic activation by indoor lighting alone.</li>
  <li><strong>Lightless / dark catalysis (darkness, 24h)</strong> — even in darkness with no light energy at all, it interacts directly with oxygen (O₂) and moisture in the air to continuously generate superoxide radicals.</li>
  <li><strong>Thermal catalysis</strong> — CO (carbon monoxide) decomposition capability improves as temperature and time increase (CO decomposition test, sample: PTVTUA improved-performance product).</li>
</ol>
<p>V-ZERO completely destroys the molecular structure of harmful substances the moment they contact the catalyst surface, neutralizing them (ZERO).</p>
<p class="tiny">* Actual performance may vary with the environment (light, temperature, humidity, contamination).</p>
<p><a class="btn btn--primary" href="business.html#technology">Learn more about the technology</a></p>`
    }
  }
];
