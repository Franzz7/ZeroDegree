'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'public');
const missing = [];
const forbiddenRefs = [];
const malformedAttrs = [];

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

function checkReference(fromFile, value) {
  const cleaned = cleanUrl(value);
  if (!cleaned || isExternal(cleaned)) return;

  if (/\.(?:png|jpe?g)$/i.test(cleaned)) {
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

if (missing.length || forbiddenRefs.length || malformedAttrs.length) {
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

  process.exit(1);
}

console.log('Site references validated.');
