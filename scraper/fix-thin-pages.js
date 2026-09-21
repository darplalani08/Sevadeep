// For pages whose async-loaded lists can flicker mid-render, visit multiple times
// and keep whichever attempt captured the most content.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://sevadeep.org';
const CONTENT_DIR = path.join(__dirname, 'content');
const ROUTES = ['/ngo-needs', '/ngos', '/donation-bucket', '/blog'];
const ATTEMPTS = 4;

function slugify(route) {
  if (route === '/' || route === '') return 'home';
  return route.replace(/^\//, '').replace(/\//g, '_') || 'home';
}

async function extractMeta(page) {
  return await page.evaluate(() => {
    const get = (sel, attr) => { const el = document.querySelector(sel); return el ? el.getAttribute(attr) : ''; };
    return {
      title: document.title,
      metaDescription: get('meta[name="description"]', 'content'),
      metaKeywords: get('meta[name="keywords"]', 'content'),
      ogTitle: get('meta[property="og:title"]', 'content'),
      ogDescription: get('meta[property="og:description"]', 'content'),
      ogImage: get('meta[property="og:image"]', 'content'),
    };
  });
}
async function extractForms(page) {
  return await page.evaluate(() => Array.from(document.querySelectorAll('form')).map((form) => ({
    action: form.action || '',
    fields: Array.from(form.querySelectorAll('input, select, textarea')).map((f) => {
      const labelEl = f.id ? document.querySelector(`label[for="${f.id}"]`) : f.closest('label');
      let options = [];
      if (f.tagName === 'SELECT') options = Array.from(f.querySelectorAll('option')).map((o) => o.textContent.trim());
      return { tag: f.tagName, type: f.type || '', name: f.name || '', placeholder: f.placeholder || '', label: labelEl ? labelEl.innerText.trim() : '', required: f.required || false, options };
    }),
  })));
}
async function extractLinks(page) {
  return await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => ({ href: a.getAttribute('href'), text: a.innerText.trim() })));
}

async function extractSections(page) {
  return await page.evaluate(() => {
    function txt(el) { return el.innerText ? el.innerText.trim() : ''; }
    function isVisible(el) { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && (r.width > 0 || r.height > 0); }
    const EXCLUDE = new Set(['app-root', 'app-admin-layout', 'app-navbar', 'app-sidebar', 'ngx-loading', 'router-outlet']);
    const customEls = Array.from(document.querySelectorAll('*')).filter((el) => el.tagName.toLowerCase().startsWith('app-') && !EXCLUDE.has(el.tagName.toLowerCase()));
    let pageRoot = document.body, maxLen = 0;
    for (const el of customEls) { const len = txt(el).length; if (len > maxLen) { maxLen = len; pageRoot = el; } }
    const headerEl = pageRoot.querySelector(':scope > header');
    const footerEl = pageRoot.querySelector(':scope > footer, footer');
    let candidates = Array.from(pageRoot.children).filter((c) => c !== headerEl && c !== footerEl && isVisible(c));
    let cur = candidates.length ? candidates.reduce((a, b) => (txt(b).length > txt(a).length ? b : a)) : pageRoot;
    let guard = 0;
    while (guard < 12) {
      const kids = Array.from(cur.children).filter(isVisible);
      const curLen = txt(cur).length;
      if (!kids.length || curLen === 0) break;
      const significantKids = kids.filter((k) => txt(k).length > curLen * 0.05);
      if (significantKids.length <= 1) {
        const next = kids.reduce((a, b) => (txt(b).length > txt(a).length ? b : a));
        if (next === cur || txt(next).length < curLen * 0.5) break;
        cur = next; guard++;
        continue;
      }
      break;
    }
    const contentRoot = cur;
    const sectionEls = Array.from(contentRoot.children).filter((c) => isVisible(c) && txt(c).length > 0);

    function summarize(el) {
      const heading = el.querySelector('h1, h2, h3, h4');
      const paragraphs = Array.from(el.querySelectorAll('p')).map((p) => txt(p)).filter(Boolean);
      const buttons = Array.from(el.querySelectorAll('button, a.btn, a[class*="button"], a[role="button"]')).map((b) => ({ text: txt(b), href: b.getAttribute('href') || '' })).filter((b) => b.text);
      const lists = Array.from(el.querySelectorAll('ul, ol')).map((ul) => Array.from(ul.querySelectorAll(':scope > li')).map((li) => txt(li)).filter(Boolean)).filter((l) => l.length);
      const headings = Array.from(el.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) => ({ tag: h.tagName, text: txt(h) })).filter((h) => h.text);
      const imgAlts = Array.from(el.querySelectorAll('img')).map((i) => i.alt).filter(Boolean);
      return { tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', heading: heading ? txt(heading) : '', headings, paragraphs, buttons, lists, imgAlts, fullText: txt(el).slice(0, 8000) };
    }

    const sections = [];
    if (headerEl) sections.push(Object.assign(summarize(headerEl), { role: 'header' }));
    for (const el of sectionEls) { const s = summarize(el); if (s.fullText) sections.push(Object.assign(s, { role: 'content' })); }
    if (footerEl) sections.push(Object.assign(summarize(footerEl), { role: 'footer' }));
    return sections;
  });
}

async function attemptOnce(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);
    // sample content length repeatedly and take the LARGEST stable-ish snapshot rather than
    // trusting "no change for N checks" (which can false-trigger on a mid-render plateau).
    let best = 0;
    for (let i = 0; i < 14; i++) {
      const len = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
      if (len > best) best = len;
      await page.waitForTimeout(700);
    }
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let total = 0;
        const timer = setInterval(() => { window.scrollBy(0, 600); total += 600; if (total >= document.body.scrollHeight + 1500) { clearInterval(timer); resolve(); } }, 80);
      });
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const meta = await extractMeta(page);
    const sections = await extractSections(page);
    const forms = await extractForms(page);
    const links = await extractLinks(page);
    const totalChars = sections.reduce((a, s) => a + s.fullText.length, 0);
    return { meta, sections, forms, links, totalChars };
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  for (const route of ROUTES) {
    const slug = slugify(route);
    let best = null;
    for (let a = 1; a <= ATTEMPTS; a++) {
      console.log(`Attempt ${a} for ${route}...`);
      try {
        const result = await attemptOnce(browser, route);
        console.log(`  totalChars=${result.totalChars}, sections=${result.sections.length}`);
        if (!best || result.totalChars > best.totalChars) best = result;
      } catch (e) {
        console.error(`  attempt failed: ${e.message}`);
      }
    }
    if (best) {
      const existingPath = path.join(CONTENT_DIR, `${slug}.json`);
      const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, 'utf-8')) : {};
      const merged = { route, meta: best.meta, sections: best.sections, forms: best.forms, links: best.links, images: existing.images || [] };
      fs.writeFileSync(existingPath, JSON.stringify(merged, null, 2));
      console.log(`SAVED ${slug}: best totalChars=${best.totalChars}, sections=${best.sections.length}`);
    }
  }
  await browser.close();
  console.log('FIX-THIN DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
