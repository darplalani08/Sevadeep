// Cleans up filenames that still contain literal percent-encoding (e.g. "%20", "%2F")
// left over from taking path.basename() of an already-encoded Firebase Storage URL.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public', 'images');
const mapping = {};

function sanitize(name) {
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // leave as-is if it doesn't decode cleanly
  }
  const ext = path.extname(decoded);
  let base = path.basename(decoded, ext);
  base = base
    .replace(/[/\\]/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}${ext.toLowerCase()}`;
}

for (const dir of fs.readdirSync(ROOT)) {
  const dirPath = path.join(ROOT, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  mapping[dir] = {};
  for (const file of fs.readdirSync(dirPath)) {
    if (!file.includes('%')) continue;
    let clean = sanitize(file);
    let dest = path.join(dirPath, clean);
    let counter = 1;
    while (fs.existsSync(dest) && dest !== path.join(dirPath, file)) {
      const ext = path.extname(clean);
      const base = path.basename(clean, ext);
      dest = path.join(dirPath, `${base}-${counter}${ext}`);
      counter++;
    }
    fs.renameSync(path.join(dirPath, file), dest);
    mapping[dir][file] = path.basename(dest);
    console.log(`${dir}/${file} -> ${path.basename(dest)}`);
  }
}

fs.writeFileSync(path.join(__dirname, 'image-rename-map.json'), JSON.stringify(mapping, null, 2));
console.log('DONE');
