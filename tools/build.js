'use strict';

// Production build: copies public/ (the hand-authored, human-editable source)
// into dist/ and minifies the HTML/CSS/JS along the way. The source in public/
// is never modified — dist/ is git-ignored, ephemeral build output that Netlify
// publishes. Run `npm run build` (or `node tools/build.js` directly).

const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify: minifyJs } = require('terser');
const { minify: minifyHtml } = require('html-minifier-terser');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'public');
const outDir = path.join(root, 'dist');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function totalSize(files) {
  return files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
}

async function minifyCssFiles(files) {
  const cleanCss = new CleanCSS({ level: 2 });
  for (const file of files) {
    const input = fs.readFileSync(file, 'utf8');
    const output = cleanCss.minify(input);
    if (output.errors.length) {
      throw new Error(`CSS minify failed for ${file}:\n${output.errors.join('\n')}`);
    }
    fs.writeFileSync(file, output.styles);
  }
}

async function minifyJsFiles(files) {
  for (const file of files) {
    const input = fs.readFileSync(file, 'utf8');
    const result = await minifyJs(input, {
      compress: true,
      mangle: true,
      format: { comments: false }
    });
    if (!result.code) {
      throw new Error(`JS minify produced empty output for ${file}`);
    }
    fs.writeFileSync(file, result.code);
  }
}

async function minifyHtmlFiles(files) {
  for (const file of files) {
    const input = fs.readFileSync(file, 'utf8');
    const output = await minifyHtml(input, {
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyCSS: true,
      minifyJS: true,
      sortAttributes: true,
      useShortDoctype: true
    });
    fs.writeFileSync(file, output);
  }
}

async function main() {
  const startedAt = Date.now();

  fs.rmSync(outDir, { recursive: true, force: true });
  copyRecursive(srcDir, outDir);

  const allFiles = walk(outDir);
  const cssFiles = allFiles.filter((f) => f.endsWith('.css'));
  const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
  const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));

  await minifyCssFiles(cssFiles);
  await minifyJsFiles(jsFiles);
  await minifyHtmlFiles(htmlFiles);

  const before = totalSize(walk(srcDir));
  const after = totalSize(walk(outDir));
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);

  console.log(`Minified ${htmlFiles.length} HTML, ${cssFiles.length} CSS, ${jsFiles.length} JS files in ${elapsed}s`);
  console.log(`public/ ${(before / 1024).toFixed(1)} KB -> dist/ ${(after / 1024).toFixed(1)} KB (${(100 - (after / before) * 100).toFixed(1)}% smaller)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
