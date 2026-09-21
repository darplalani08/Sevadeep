const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'qa', 'new-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  '/', '/ngos', '/ngo-needs', '/donation-bucket', '/blog',
  '/blog/donate-food', '/ngo-login', '/donor-login', '/ngo-registration',
  '/volunteer-register', '/narayan-seva', '/gallery',
];

function slugify(r) {
  return r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '_');
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (e) => errors.push(`${width} ${page.url()}: ${e.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`${width} ${page.url()} console: ${msg.text()}`);
    });
    for (const route of routes) {
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(500);
        await page.evaluate(async () => {
          await new Promise((resolve) => {
            let total = 0;
            const t = setInterval(() => {
              window.scrollBy(0, 600);
              total += 600;
              if (total >= document.body.scrollHeight + 1000) { clearInterval(t); resolve(); }
            }, 60);
          });
        });
        await page.waitForTimeout(400);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(OUT, `${slugify(route)}_${width}.png`), fullPage: true });
        console.log(`OK ${width} ${route}`);
      } catch (e) {
        console.error(`FAIL ${width} ${route}: ${e.message}`);
      }
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'errors.json'), JSON.stringify(errors, null, 2));
  console.log('DONE', errors.length, 'console/page errors');
})();
