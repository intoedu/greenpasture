#!/usr/bin/env node
/* =========================================================================
 * 공유 미리보기 이미지 만들기 — tools/og/og.html → assets/img/og-image.jpg
 * -------------------------------------------------------------------------
 * 실행:  node tools/make-og.js
 * 필요:  Node.js 와 Playwright (없으면: npm i -D playwright && npx playwright install chromium)
 * 로고나 문구를 바꾼 뒤 실행하면 카카오톡 · 페이스북 공유 이미지가 새로 만들어집니다.
 * ========================================================================= */
const path = require('path');
const fs = require('fs');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('Playwright 가 없습니다. 먼저 설치하세요:\n  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

(async () => {
  const src = path.join(__dirname, 'og', 'og.html');
  const out = path.join(__dirname, '..', 'assets', 'img', 'og-image.jpg');
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    // 브라우저가 따로 설치된 환경이면 CHROMIUM_PATH 로 경로를 알려 주세요
    const alt = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
    if (!fs.existsSync(alt)) throw e;
    browser = await chromium.launch({ executablePath: alt });
  }
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file://' + src);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await browser.close();
  console.log('저장: ' + out + ' (1200×630, ' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
})().catch(e => { console.error(e); process.exit(1); });
