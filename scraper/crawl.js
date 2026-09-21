// Crawler for sevadeep.org — renders each route with headless Chromium (SPA),
// captures screenshots, extracts text sections, records images, forms, and design tokens.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE = 'https://sevadeep.org';
const ROOT = __dirname;
const SHOT_DIR = path.join(ROOT, 'screenshots');
const CONTENT_DIR = path.join(ROOT, 'content');
const IMG_ROOT = path.join(ROOT, '..', 'public', 'images');

const SEED_ROUTES = [
  '/', '/ngos', '/ngo-needs', '/donation-bucket', '/blog', '/ngo-login',
  '/donor-login', '/ngo-registration', '/volunteer-register', '/narayan-seva',
];

const BLOG_ROUTES = [
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

const visited = new Set();
const discovered = new Set();
const missingImages = [];
const allImageMap = {}; // page -> [{src, localPath}]
const sitemapData = []; // {route, title, metaDescription, sections, forms, links}

function slugify(route) {
  if (route === '/' || route === '') return 'home';
  return route.replace(/^\//, '').replace(/\//g, '_') || 'home';
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.get(u, { timeout: 20000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadFile(new URL(res.headers.location, url).toString(), destPath).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(destPath)));
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('timeout')));
    } catch (e) {
      reject(e);
    }
  });
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight + 1000) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

async function extractImages(page, pageSlug) {
  const imgs = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('img').forEach((img) => {
      if (img.src) results.push({ src: img.src, alt: img.alt || '', srcset: img.srcset || '' });
    });
    document.querySelectorAll('*').forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg.startsWith('url(')) {
        const m = bg.match(/url\(["']?(.*?)["']?\)/);
        if (m && m[1] && !m[1].startsWith('data:')) results.push({ src: m[1], alt: '', srcset: '', bg: true });
      }
    });
    return results;
  });
  const destDir = path.join(IMG_ROOT, pageSlug);
  fs.mkdirSync(destDir, { recursive: true });
  const mapping = [];
  const seen = new Set();
  for (const img of imgs) {
    let absUrl;
    try {
      absUrl = new URL(img.src, BASE).toString();
    } catch {
      continue;
    }
    if (seen.has(absUrl)) continue;
    seen.add(absUrl);
    const urlPath = new URL(absUrl).pathname;
    let filename = path.basename(urlPath).split('?')[0];
    if (!filename || filename === '/') filename = `img_${mapping.length}.png`;
    let destPath = path.join(destDir, filename);
    let counter = 1;
    while (fs.existsSync(destPath) && mapping.some(m => m.localPath === destPath)) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      destPath = path.join(destDir, `${base}_${counter}${ext}`);
      counter++;
    }
    try {
      await downloadFile(absUrl, destPath);
      mapping.push({ src: absUrl, alt: img.alt, localPath: `/images/${pageSlug}/${path.basename(destPath)}`, isBackground: !!img.bg });
    } catch (e) {
      missingImages.push(`${absUrl} (page: ${pageSlug}) — ${e.message}`);
      mapping.push({ src: absUrl, alt: img.alt, localPath: null, error: e.message, isBackground: !!img.bg });
    }
  }
  return mapping;
}

async function extractSections(page) {
  return await page.evaluate(() => {
    function isVisible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || rect.height > 0);
    }
    const sectionSelectors = 'section, header, footer, main > div, [class*="section"]';
    const nodes = Array.from(document.querySelectorAll(sectionSelectors)).filter(isVisible);
    const topLevel = [];
    for (const n of nodes) {
      if (!nodes.some((other) => other !== n && other.contains(n))) topLevel.push(n);
    }
    const seen = new Set();
    const unique = topLevel.filter((n) => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
    const list = unique.length ? unique : [document.body];
    return list.map((el) => {
      const heading = el.querySelector('h1, h2, h3');
      const subheading = el.querySelector('h4, h5, h6, p:first-of-type');
      const paragraphs = Array.from(el.querySelectorAll('p')).map((p) => p.innerText.trim()).filter(Boolean);
      const buttons = Array.from(el.querySelectorAll('button, a.btn, a[class*="button"], a[role="button"]'))
        .map((b) => ({ text: b.innerText.trim(), href: b.getAttribute('href') || '' }))
        .filter((b) => b.text);
      const lists = Array.from(el.querySelectorAll('ul, ol')).map((ul) =>
        Array.from(ul.querySelectorAll('li')).map((li) => li.innerText.trim()).filter(Boolean)
      ).filter((l) => l.length);
      const headings = Array.from(el.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) => ({ tag: h.tagName, text: h.innerText.trim() })).filter(h => h.text);
      return {
        tag: el.tagName,
        className: el.className && typeof el.className === 'string' ? el.className : '',
        heading: heading ? heading.innerText.trim() : '',
        subheading: subheading ? subheading.innerText.trim() : '',
        headings,
        paragraphs,
        buttons,
        lists,
        fullText: el.innerText.trim().slice(0, 5000),
      };
    }).filter((s) => s.fullText);
  });
}

async function extractForms(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map((form) => {
      const fields = Array.from(form.querySelectorAll('input, select, textarea')).map((f) => {
        const labelEl = f.id ? document.querySelector(`label[for="${f.id}"]`) : f.closest('label');
        let options = [];
        if (f.tagName === 'SELECT') {
          options = Array.from(f.querySelectorAll('option')).map((o) => o.textContent.trim());
        }
        return {
          tag: f.tagName,
          type: f.type || '',
          name: f.name || '',
          placeholder: f.placeholder || '',
          label: labelEl ? labelEl.innerText.trim() : '',
          required: f.required || false,
          options,
        };
      });
      return { action: form.action || '', fields };
    });
  });
}

async function extractLinks(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map((a) => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim(),
    }));
  });
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

async function extractDesignTokens(page) {
  return await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const h1 = document.querySelector('h1');
    const btn = document.querySelector('button, a.btn, a[class*="button"]');
    const colors = new Set();
    document.querySelectorAll('*').forEach((el) => {
      const s = getComputedStyle(el);
      if (s.color) colors.add(s.color);
      if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(s.backgroundColor);
    });
    return {
      bodyFont: body.fontFamily,
      bodyFontSize: body.fontSize,
      bodyColor: body.color,
      bodyBackground: body.backgroundColor,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : '',
      h1Size: h1 ? getComputedStyle(h1).fontSize : '',
      h1Weight: h1 ? getComputedStyle(h1).fontWeight : '',
      h1Color: h1 ? getComputedStyle(h1).color : '',
      buttonBg: btn ? getComputedStyle(btn).backgroundColor : '',
      buttonColor: btn ? getComputedStyle(btn).color : '',
      buttonRadius: btn ? getComputedStyle(btn).borderRadius : '',
      buttonFont: btn ? getComputedStyle(btn).fontFamily : '',
      uniqueColors: Array.from(colors).slice(0, 60),
    };
  });
}

async function crawlPage(browser, route) {
  const slug = slugify(route);
  if (visited.has(route)) return;
  visited.add(route);
  console.log(`Crawling: ${route}`);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() =>
      page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
    );
    await page.waitForTimeout(1500);

    // try opening mobile hamburger menu later; for now on desktop try dropdowns
    try {
      const navToggles = await page.$$('nav button, [class*="dropdown-toggle"], [class*="menu-toggle"]');
      for (const t of navToggles.slice(0, 5)) {
        await t.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(200);
      }
    } catch {}

    await autoScroll(page);

    // full page screenshot @1440
    await page.screenshot({ path: path.join(SHOT_DIR, `${slug}_1440.png`), fullPage: true }).catch(() => {});

    const meta = await extractMeta(page);
    const sections = await extractSections(page);
    const forms = await extractForms(page);
    const links = await extractLinks(page);
    const images = await extractImages(page, slug);
    const designTokens = route === '/' ? await extractDesignTokens(page) : null;

    allImageMap[slug] = images;

    fs.writeFileSync(
      path.join(CONTENT_DIR, `${slug}.json`),
      JSON.stringify({ route, meta, sections, forms, links, images }, null, 2)
    );

    sitemapData.push({ route, slug, title: meta.title, metaDescription: meta.metaDescription, sectionCount: sections.length, sectionHeadings: sections.map(s => s.heading || s.headings[0]?.text || '(untitled section)'), imageCount: images.length, forms: forms.length });

    for (const l of links) {
      if (!l.href) continue;
      let abs;
      try {
        abs = new URL(l.href, BASE + route);
      } catch {
        continue;
      }
      if (abs.hostname !== 'sevadeep.org') continue;
      const p = abs.pathname;
      if (p && !visited.has(p) && !discovered.has(p)) discovered.add(p);
    }

    await context.close();
  } catch (e) {
    console.error(`Error crawling ${route}: ${e.message}`);
    await context.close();
  }

  // mobile screenshot in a fresh context
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mctx.newPage();
  try {
    await mpage.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() =>
      mpage.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
    );
    await mpage.waitForTimeout(1200);
    await autoScroll(mpage);
    await mpage.screenshot({ path: path.join(SHOT_DIR, `${slug}_390.png`), fullPage: true }).catch(() => {});
  } catch (e) {
    console.error(`Mobile screenshot error ${route}: ${e.message}`);
  }
  await mctx.close();
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(IMG_ROOT, { recursive: true });

  const browser = await chromium.launch();

  const queue = [...SEED_ROUTES, ...BLOG_ROUTES];
  for (const r of queue) {
    await crawlPage(browser, r);
  }

  // crawl newly discovered routes (e.g. ngo detail pages, extra blog posts) up to a cap
  let extra = Array.from(discovered).filter((r) => !visited.has(r));
  let cap = 40;
  while (extra.length && cap > 0) {
    const r = extra.shift();
    cap--;
    if (visited.has(r)) continue;
    await crawlPage(browser, r);
    extra = Array.from(discovered).filter((r2) => !visited.has(r2));
  }

  await browser.close();

  fs.writeFileSync(path.join(ROOT, 'all-links-discovered.json'), JSON.stringify(Array.from(discovered), null, 2));
  fs.writeFileSync(path.join(ROOT, 'sitemap-data.json'), JSON.stringify(sitemapData, null, 2));
  if (missingImages.length) {
    fs.writeFileSync(path.join(ROOT, '..', 'scraper', 'missing-images.md'), '# Missing Images\n\n' + missingImages.map(m => `- ${m}`).join('\n'));
  }
  console.log('DONE. Visited:', Array.from(visited));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
