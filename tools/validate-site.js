'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'public');
const missing = [];
const forbiddenRefs = [];
const malformedAttrs = [];
const seoIssues = [];

// Search-result limits. Titles beyond ~60 chars and descriptions beyond
// ~165 get truncated by Google; much shorter than the lower bound wastes
// the space. Kept as a range rather than an exact target.
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 165;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function isExternal(value) {
  return /^(?:[a-z]+:)?\/\//i.test(value) ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    value.startsWith('data:') ||
    value.startsWith('#');
}

function cleanUrl(value) {
  return value.trim().replace(/^['"]|['"]$/g, '').split('#')[0].split('?')[0];
}

// Favicons and touch icons have to stay PNG/ICO — WebP isn't reliably
// supported for them, so they're exempt from the WebP-only rule below.
const ICON_ASSETS = new Set([
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
]);

function checkReference(fromFile, value) {
  const cleaned = cleanUrl(value);
  if (!cleaned || isExternal(cleaned)) return;

  if (/\.(?:png|jpe?g)$/i.test(cleaned) && !ICON_ASSETS.has(cleaned)) {
    forbiddenRefs.push(`${path.relative(root, fromFile)} -> ${cleaned}`);
  }

  const target = cleaned.startsWith('/')
    ? path.join(root, cleaned)
    : path.resolve(path.dirname(fromFile), cleaned);

  if (!target.startsWith(root) || !fs.existsSync(target)) {
    missing.push(`${path.relative(root, fromFile)} -> ${cleaned}`);
  }
}

for (const file of walk(root)) {
  const ext = path.extname(file).toLowerCase();
  if (!['.html', '.css', '.js'].includes(ext)) continue;

  const text = fs.readFileSync(file, 'utf8');

  if (ext === '.html') {
    if (/\b(?:action|class|href|src)=[\u201c\u201d]/i.test(text)) {
      malformedAttrs.push(path.relative(root, file));
    }

    for (const match of text.matchAll(/\b(?:href|src|action)=["']([^"']+)["']/gi)) {
      checkReference(file, match[1]);
    }
  }

  if (ext === '.css') {
    for (const match of text.matchAll(/url\(([^)]+)\)/gi)) {
      checkReference(file, match[1]);
    }
  }
}

if (fs.existsSync(path.join(root, 'node_modules'))) {
  missing.push('public/node_modules should not exist');
}

// ── SEO checks ───────────────────────────────────────────────────────────────
// These guard the work done in the SEO passes: without them a title, canonical
// or sitemap entry can quietly go missing again on the next edit.

const ENTITIES = {
  '&amp;': '&', '&pound;': '£', '&mdash;': '—', '&ndash;': '–',
  '&rsquo;': '’', '&lsquo;': '‘', '&middot;': '·', '&nbsp;': ' ', '&copy;': '©'
};

// Approximate the rendered length: entities count as one character, not six.
function renderedLength(value) {
  return value.replace(/&[a-z]+;/g, (e) => ENTITIES[e] || e).length;
}

const sitemapPath = path.join(root, 'sitemap.xml');
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';

for (const file of walk(root).filter((f) => path.extname(f).toLowerCase() === '.html')) {
  const name = path.relative(root, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const flag = (msg) => seoIssues.push(`${name}: ${msg}`);

  const h1Count = (text.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) flag(`${h1Count} <h1> elements, expected exactly 1`);

  const title = (text.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  if (!title) flag('missing <title>');
  else if (renderedLength(title) > TITLE_MAX) {
    flag(`title is ${renderedLength(title)} chars, over the ${TITLE_MAX} limit`);
  }

  const desc = (text.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/i) || [])[1];
  if (!desc) flag('missing meta description');
  else {
    const len = renderedLength(desc);
    if (len < DESC_MIN || len > DESC_MAX) {
      flag(`meta description is ${len} chars, outside ${DESC_MIN}-${DESC_MAX}`);
    }
  }

  if (!/<link\s+rel="canonical"/i.test(text)) flag('missing canonical link');

  for (const [tag] of text.matchAll(/<img\b[^>]*>/gi)) {
    const hasAlt = /\salt="[^"]+"/i.test(tag);
    const decorative = /\salt=""/i.test(tag) && /aria-hidden="true"/i.test(tag);
    if (!hasAlt && !decorative) {
      const src = (tag.match(/src="([^"]*)"/i) || [])[1] || tag.slice(0, 60);
      flag(`<img> without alt text: ${src}`);
    }
  }

  for (const [, block] of text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(block);
    } catch (error) {
      flag(`invalid JSON-LD: ${error.message}`);
    }
    if (/&(?:amp|pound|mdash|ndash|rsquo|nbsp);/.test(block)) {
      flag('JSON-LD contains HTML entities (script content is not entity-decoded)');
    }
  }

  if (sitemap) {
    const loc = name === 'index.html' ? 'https://deepchill.co.uk/</loc>' : `/${name}</loc>`;
    if (!sitemap.includes(loc)) flag('not listed in sitemap.xml');
  }
}

if (missing.length || forbiddenRefs.length || malformedAttrs.length || seoIssues.length) {
  if (missing.length) {
    console.error('Missing local references:');
    missing.forEach((item) => console.error(`  - ${item}`));
  }

  if (forbiddenRefs.length) {
    console.error('Use WebP/SVG assets instead of PNG/JPG references:');
    forbiddenRefs.forEach((item) => console.error(`  - ${item}`));
  }

  if (malformedAttrs.length) {
    console.error('HTML attributes use smart quotes instead of normal quotes:');
    malformedAttrs.forEach((item) => console.error(`  - ${item}`));
  }

  if (seoIssues.length) {
    console.error('SEO issues:');
    seoIssues.forEach((item) => console.error(`  - ${item}`));
  }

  process.exit(1);
}

console.log('Site references and SEO metadata validated.');
