const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://sevadeep.org';
const PAGES = ['/', '/ngos', '/ngo-needs', '/donor-login', '/ngo-login', '/blog'];

async function extractTokens(page) {
  return await page.evaluate(() => {
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const body = cs(document.body);
    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2, .heading, [class*="heading"]');
    const p = document.querySelector('p');
    const primaryBtn = document.querySelector('button, .btn, a[class*="btn"], [class*="button"]');
    const navLink = document.querySelector('nav a, header a, .ul-responsive a');
    const logo = document.querySelector('img.logo, header img, .logo img');

    const colorCount = {};
    document.querySelectorAll('*').forEach((el) => {
      const s = getComputedStyle(el);
      [s.color, s.backgroundColor, s.borderTopColor].forEach((c) => {
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(0, 0, 0)' && c !== 'rgb(255, 255, 255)') {
          colorCount[c] = (colorCount[c] || 0) + 1;
        }
      });
    });
    const topColors = Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([c, n]) => ({ color: c, count: n }));

    return {
      body: { fontFamily: body.fontFamily, fontSize: body.fontSize, lineHeight: body.lineHeight, color: body.color, background: body.backgroundColor },
      h1: h1 ? { fontFamily: cs(h1).fontFamily, fontSize: cs(h1).fontSize, fontWeight: cs(h1).fontWeight, color: cs(h1).color, lineHeight: cs(h1).lineHeight } : null,
      h2: h2 ? { fontFamily: cs(h2).fontFamily, fontSize: cs(h2).fontSize, fontWeight: cs(h2).fontWeight, color: cs(h2).color } : null,
      paragraph: p ? { fontFamily: cs(p).fontFamily, fontSize: cs(p).fontSize, color: cs(p).color, lineHeight: cs(p).lineHeight } : null,
      primaryButton: primaryBtn ? { background: cs(primaryBtn).backgroundColor, color: cs(primaryBtn).color, borderRadius: cs(primaryBtn).borderRadius, fontFamily: cs(primaryBtn).fontFamily, fontWeight: cs(primaryBtn).fontWeight, padding: cs(primaryBtn).padding, textTransform: cs(primaryBtn).textTransform } : null,
      navLink: navLink ? { color: cs(navLink).color, fontWeight: cs(navLink).fontWeight, fontFamily: cs(navLink).fontFamily } : null,
      logoSrc: logo ? logo.src : null,
      topColors,
      viewportWidth: window.innerWidth,
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  const result = {};
  for (const route of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      result[route] = await extractTokens(page);
      console.log(`Captured tokens for ${route}`);
    } catch (e) {
      console.error(`Error on ${route}: ${e.message}`);
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'design-tokens.json'), JSON.stringify(result, null, 2));
  console.log('DESIGN TOKENS DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
