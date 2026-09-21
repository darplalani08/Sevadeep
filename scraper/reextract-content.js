// Re-extracts structured sections/forms/links/meta for all already-crawled routes,
// using a generic algorithm that finds the Angular page-content root instead of
// relying on <section>/<header>/<footer> tags (this SPA doesn't use them consistently).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://sevadeep.org';
const CONTENT_DIR = path.join(__dirname, 'content');

const ROUTES = [
  '/', '/ngos', '/ngo-needs', '/donation-bucket', '/blog', '/ngo-login',
  '/donor-login', '/ngo-registration', '/volunteer-register', '/narayan-seva', '/gallery',
  '/blog/title/donate-items-this-chrismas',
  '/blog/title/donate-food',
  '/blog/title/donate-your-old-stuff-this-diwali',
  '/blog/title/donate-food-money-old-items',
  '/blog/title/how-to-donate-old-items-to-charity',
  '/blog/title/ngo-needs-in-pune',
  '/blog/title/support-donate-to-old-age-homes',
  '/blog/title/best-things-to-donate-to-orphanage',
  '/blog/title/donate-to-people-in-need',
  '/blog/title/help-the-ngos-in-pune',
];

function slugify(route) {
  if (route === '/' || route === '') return 'home';
  return route.replace(/^\//, '').replace(/\//g, '_') || 'home';
}

async function waitForStableContent(page, { maxWait = 20000, interval = 600, stableChecks = 3 } = {}) {
  let stable = 0;
  let lastLen = -1;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const len = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
    if (len === lastLen && len > 0) {
      stable++;
      if (stable >= stableChecks) return;
    } else {
      stable = 0;
    }
    lastLen = len;
    await page.waitForTimeout(interval);
  }
}

async function extractMeta(page) {
  return await page.evaluate(() => {
    const get = (sel, attr) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(attr) : '';
    };
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
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map((form) => {
      const fields = Array.from(form.querySelectorAll('input, select, textarea')).map((f) => {
        const labelEl = f.id ? document.querySelector(`label[for="${f.id}"]`) : f.closest('label');
        let options = [];
        if (f.tagName === 'SELECT') options = Array.from(f.querySelectorAll('option')).map((o) => o.textContent.trim());
        return { tag: f.tagName, type: f.type || '', name: f.name || '', placeholder: f.placeholder || '', label: labelEl ? labelEl.innerText.trim() : '', required: f.required || false, options };
      });
      return { action: form.action || '', fields };
    });
  });
}

async function extractLinks(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map((a) => ({ href: a.getAttribute('href'), text: a.innerText.trim() }));
  });
}

async function extractSections(page) {
  return await page.evaluate(() => {
    function txt(el) { return el.innerText ? el.innerText.trim() : ''; }
    function isVisible(el) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
    }

    // Find the largest custom Angular element (app-xxx) excluding known layout shells.
    const EXCLUDE = new Set(['app-root', 'app-admin-layout', 'app-navbar', 'app-sidebar', 'ngx-loading', 'router-outlet']);
    const customEls = Array.from(document.querySelectorAll('*')).filter((el) => el.tagName.toLowerCase().startsWith('app-') && !EXCLUDE.has(el.tagName.toLowerCase()));
    let pageRoot = document.body;
    let maxLen = 0;
    for (const el of customEls) {
      const len = txt(el).length;
      if (len > maxLen) { maxLen = len; pageRoot = el; }
    }

    // Separate header/nav and footer within pageRoot if present.
    const headerEl = pageRoot.querySelector(':scope > header');
    const footerEl = pageRoot.querySelector(':scope > footer, footer');

    // Descend through wrapper divs to find the real multi-section content container.
    // Pick the direct child with the most text (ignores tiny floating widgets like a WhatsApp button),
    // then keep descending into whichever child holds the bulk of the text until we hit
    // a container that actually fans out into multiple substantial sections.
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
        cur = next;
        guard++;
        continue;
      }
      break; // found a container with multiple substantial children -> use as sections
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
      return {
        tag: el.tagName,
        className: typeof el.className === 'string' ? el.className : '',
        heading: heading ? txt(heading) : '',
        headings,
        paragraphs,
        buttons,
        lists,
        imgAlts,
        fullText: txt(el).slice(0, 6000),
      };
    }

    const sections = [];
    if (headerEl) sections.push(Object.assign(summarize(headerEl), { role: 'header' }));
    for (const el of sectionEls) {
      const s = summarize(el);
      if (s.fullText) sections.push(Object.assign(s, { role: 'content' }));
    }
    if (footerEl) sections.push(Object.assign(summarize(footerEl), { role: 'footer' }));

    return sections;
  });
}

async function main() {
  const browser = await chromium.launch();
  for (const route of ROUTES) {
    const slug = slugify(route);
    console.log('Re-extracting:', route);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1500);
      await waitForStableContent(page);
      // scroll to trigger lazy content
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let total = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 600);
            total += 600;
            if (total >= document.body.scrollHeight + 1500) { clearInterval(timer); resolve(); }
          }, 80);
        });
      });
      await waitForStableContent(page, { maxWait: 8000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);

      const meta = await extractMeta(page);
      const sections = await extractSections(page);
      const forms = await extractForms(page);
      const links = await extractLinks(page);

      const existingPath = path.join(CONTENT_DIR, `${slug}.json`);
      const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, 'utf-8')) : {};
      const merged = { route, meta, sections, forms, links, images: existing.images || [] };
      fs.writeFileSync(existingPath, JSON.stringify(merged, null, 2));
      console.log(`  -> ${sections.length} sections, ${sections.reduce((a, s) => a + s.fullText.length, 0)} chars`);
    } catch (e) {
      console.error(`  Error on ${route}:`, e.message);
    }
    await page.close();
  }
  await browser.close();
  console.log('RE-EXTRACT DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
