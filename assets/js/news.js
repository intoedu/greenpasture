/* =========================================================================
 * 공지 · 소식 게시판 (news.html)
 * -------------------------------------------------------------------------
 * 글 내용은 assets/data/posts.js 에 있습니다. 이 파일은 고칠 필요가 없습니다.
 *   목록 : news.html            (분류 ?cat=notice, 검색 ?q=검색어, 페이지 ?page=2)
 *   본문 : news.html?id=글id
 * ========================================================================= */
(function () {
  const POSTS = (window.GP_POSTS || []).slice();
  const CATS = window.GP_POST_CATEGORIES || {};
  const PER_PAGE = 10;
  const NEW_DAYS = 14;

  const listView = document.getElementById('boardView');
  const postView = document.getElementById('postView');
  const listEl = document.getElementById('boardList');
  const tabsEl = document.getElementById('boardTabs');
  const pagerEl = document.getElementById('boardPager');
  const searchForm = document.getElementById('boardSearch');
  const searchInput = document.getElementById('searchWord');
  if (!listEl || !postView) return;

  const esc = window.escapeHtml || function (s) { return String(s); };
  const lang = function () { return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ko'; };
  const bi = function (o) { return `<span data-lang="ko">${esc(o.ko)}</span><span data-lang="en">${esc(o.en)}</span>`; };
  const catOf = function (p) { return CATS[p.category] || { ko: p.category, en: p.category }; };
  const fmt = function (d) { return d.replace(/-/g, '.'); };
  const stripTags = function (html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  };
  function isNew(p) {
    const diff = (Date.now() - new Date(p.date + 'T00:00:00+09:00').getTime()) / 86400000;
    return diff >= 0 && diff <= NEW_DAYS;
  }

  // 고정글 먼저, 그다음 최신순
  POSTS.sort(function (a, b) {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });
  // 번호는 날짜순 누적 (가장 오래된 글이 1번)
  const byDate = POSTS.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  const numberOf = new Map(byDate.map(function (p, i) { return [p.id, i + 1]; }));

  const state = { cat: 'all', q: '', page: 1 };

  function readQuery() {
    const u = new URLSearchParams(location.search);
    state.cat = CATS[u.get('cat')] ? u.get('cat') : 'all';
    state.q = (u.get('q') || '').trim();
    state.page = Math.max(1, parseInt(u.get('page') || '1', 10) || 1);
    return u.get('id');
  }
  function writeQuery(push) {
    const u = new URL(location.href);
    ['cat', 'q', 'page', 'id'].forEach(function (k) { u.searchParams.delete(k); });
    if (state.cat !== 'all') u.searchParams.set('cat', state.cat);
    if (state.q) u.searchParams.set('q', state.q);
    if (state.page > 1) u.searchParams.set('page', String(state.page));
    history[push ? 'pushState' : 'replaceState'](null, '', u);
  }

  /* ---------------- 목록 ---------------- */
  function filtered() {
    const q = state.q.toLowerCase();
    return POSTS.filter(function (p) {
      if (state.cat !== 'all' && p.category !== state.cat) return false;
      if (!q) return true;
      const hay = [p.title.ko, p.title.en, p.summary.ko, p.summary.en, stripTags(p.body.ko), stripTags(p.body.en)].join(' ').toLowerCase();
      return hay.indexOf(q) > -1;
    });
  }

  function renderTabs() {
    const counts = { all: POSTS.length };
    POSTS.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    const tabs = [{ key: 'all', label: { ko: '전체', en: 'All' } }].concat(
      Object.keys(CATS).map(function (k) { return { key: k, label: CATS[k] }; })
    );
    tabsEl.innerHTML = tabs.map(function (t) {
      const on = t.key === state.cat;
      return `<button type="button" class="tab${on ? ' is-active' : ''}" data-cat-key="${t.key}" aria-pressed="${on}">${bi(t.label)}<span class="count">${counts[t.key] || 0}</span></button>`;
    }).join('');
  }

  function renderList() {
    const rows = filtered();
    const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    const slice = rows.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    if (!slice.length) {
      listEl.innerHTML = `<p class="board__empty"><span data-lang="ko">조건에 맞는 글이 없습니다.</span><span data-lang="en">No posts found.</span></p>`;
    } else {
      listEl.innerHTML = slice.map(function (p) {
        return `<a class="board__row${p.pinned ? ' board__row--pin' : ''}" href="news.html?id=${encodeURIComponent(p.id)}" data-id="${esc(p.id)}">
          <span class="board__no">${p.pinned ? '<span class="badge badge--dark">' + bi({ ko: '공지', en: 'Pinned' }) + '</span>' : numberOf.get(p.id)}</span>
          <span class="badge">${bi(catOf(p))}</span>
          <span class="board__title">${isNew(p) ? '<span class="board__new">NEW</span>' : ''}<span class="t">${bi(p.title)}</span></span>
          <time class="board__date" datetime="${esc(p.date)}">${fmt(p.date)}</time>
        </a>`;
      }).join('');
    }

    if (pages <= 1) { pagerEl.innerHTML = ''; return; }
    let html = `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="이전 페이지">‹</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button type="button" data-page="${i}" class="${i === state.page ? 'is-active' : ''}" ${i === state.page ? 'aria-current="page"' : ''}>${i}</button>`;
    }
    html += `<button type="button" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="다음 페이지">›</button>`;
    pagerEl.innerHTML = html;
  }

  function showList() {
    postView.hidden = true;
    listView.hidden = false;
    searchInput.value = state.q;
    renderTabs();
    renderList();
    setTitle(null);
  }

  /* ---------------- 본문 ---------------- */
  function shareUrl(p) {
    const u = new URL(location.href);
    u.search = '?id=' + encodeURIComponent(p.id);
    u.hash = '';
    return u.toString();
  }

  function showPost(id) {
    const idx = POSTS.findIndex(function (p) { return p.id === id; });
    listView.hidden = true;
    postView.hidden = false;

    if (idx < 0) {
      postView.innerHTML = `<div class="board__empty">
        <p><span data-lang="ko">요청하신 글을 찾을 수 없습니다.</span><span data-lang="en">The post could not be found.</span></p>
        <p style="margin-top:20px"><a class="btn btn--dark" href="news.html">${bi({ ko: '목록으로', en: 'Back to list' })}</a></p>
      </div>`;
      setTitle(null);
      return;
    }

    const p = POSTS[idx];
    const newer = POSTS[idx - 1];
    const older = POSTS[idx + 1];
    const url = shareUrl(p);
    const enc = encodeURIComponent(url);

    postView.innerHTML = `
      <header class="post__head">
        <span class="badge">${bi(catOf(p))}</span>
        <h2>${bi(p.title)}</h2>
        <div class="post__meta">
          <time datetime="${esc(p.date)}">${fmt(p.date)}</time>
          <span>${bi({ ko: '주식회사 그린파스처', en: 'Green Pasture Co., Ltd.' })}</span>
        </div>
      </header>
      <div class="post__body prose">
        <div data-lang="ko">${p.body.ko}</div>
        <div data-lang="en">${p.body.en}</div>
      </div>
      <div class="post__share">
        <span>${bi({ ko: '공유하기', en: 'Share' })}</span>
        <button type="button" class="share-btn" data-share="copy">${ICON.link}${bi({ ko: '링크 복사', en: 'Copy link' })}</button>
        ${navigator.share ? `<button type="button" class="share-btn" data-share="native">${ICON.share}${bi({ ko: '다른 앱으로', en: 'Share via…' })}</button>` : ''}
        <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${enc}" target="_blank" rel="noopener">${ICON.facebook}Facebook</a>
        <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${enc}" target="_blank" rel="noopener">${ICON.linkedin}LinkedIn</a>
      </div>
      <nav class="post__nav" aria-label="이전 · 다음 글">
        ${newer ? `<a href="news.html?id=${encodeURIComponent(newer.id)}"><span>${bi({ ko: '다음 글', en: 'Next' })}</span><span>${bi(newer.title)}</span></a>` : ''}
        ${older ? `<a href="news.html?id=${encodeURIComponent(older.id)}"><span>${bi({ ko: '이전 글', en: 'Previous' })}</span><span>${bi(older.title)}</span></a>` : ''}
      </nav>
      <div class="post__actions"><a class="btn btn--dark" href="news.html">${bi({ ko: '목록으로', en: 'Back to list' })}</a></div>`;

    postView.querySelectorAll('[data-share]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.share === 'native') {
          navigator.share({ title: p.title[lang()], url: url }).catch(function () { /* 취소 */ });
          return;
        }
        const done = function () {
          const original = btn.innerHTML;
          btn.innerHTML = ICON.check + bi({ ko: '복사되었습니다', en: 'Copied' });
          setTimeout(function () { btn.innerHTML = original; }, 1800);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy', url); });
        } else {
          window.prompt(lang() === 'en' ? 'Copy this link' : '아래 링크를 복사하세요', url);
        }
      });
    });
    setTitle(p);
    window.scrollTo({ top: 0 });
  }

  let current = null;
  function setTitle(p) {
    current = p;
    const base = lang() === 'en' ? 'News | Green Pasture Co., Ltd.' : '공지 · 소식 | 주식회사 그린파스처';
    document.title = p ? `${p.title[lang()]} | ${lang() === 'en' ? 'Green Pasture' : '그린파스처'}` : base;
  }
  document.addEventListener('gp:lang', function () { setTitle(current); });

  /* ---------------- 이벤트 ---------------- */
  tabsEl.addEventListener('click', function (e) {
    const b = e.target.closest('[data-cat-key]');
    if (!b) return;
    state.cat = b.dataset.catKey;
    state.page = 1;
    writeQuery(false);
    renderTabs();
    renderList();
  });
  pagerEl.addEventListener('click', function (e) {
    const b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    state.page = parseInt(b.dataset.page, 10);
    writeQuery(false);
    renderList();
    listView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  searchForm.addEventListener('submit', function (e) { e.preventDefault(); });
  let t;
  searchInput.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      state.q = searchInput.value.trim();
      state.page = 1;
      writeQuery(false);
      renderList();
    }, 180);
  });
  // 목록 → 본문은 페이지 이동 없이 전환합니다
  listEl.addEventListener('click', function (e) {
    const a = e.target.closest('a[data-id]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    const u = new URL(location.href);
    u.search = '?id=' + encodeURIComponent(a.dataset.id);
    history.pushState(null, '', u);
    showPost(a.dataset.id);
  });
  window.addEventListener('popstate', route);

  function route() {
    const id = readQuery();
    if (id) showPost(id); else showList();
  }

  document.addEventListener('DOMContentLoaded', route);
})();
