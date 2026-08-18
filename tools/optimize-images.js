'use strict';

/**
 * One-off / occasional image optimiser.
 *
 * Re-encodes the WebP assets in public/Images at sensible dimensions and
 * quality. Run it against the committed originals, check the diff, and commit
 * the result — re-running repeatedly would recompress already-lossy output.
 *
 *   npm run optimize-images          # apply
 *   npm run optimize-images -- --dry # report only
 *
 * sharp is a devDependency, so this never runs on Netlify
 * (the build uses `npm ci --omit=dev`).
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(__dirname, '..', 'public', 'Images');

// maxWidth: cap on the longest edge. quality: WebP quality.
// Hero backgrounds sit under a heavy dark vignette overlay, so they tolerate
// more compression than content images without visible loss.
const TARGETS = [
  { file: 'HeroNew.webp', maxWidth: 1600, quality: 76, note: 'desktop hero background (overlaid)' },
  { file: 'HeroNewPhone.webp', maxWidth: 1000, quality: 72, note: 'mobile hero background (overlaid, LCP)' },
  { file: 'Gallery/1.webp', maxWidth: 1600, quality: 76, note: 'events hero background (overlaid)' },
  { file: 'What we do/coldPoolReady.webp', maxWidth: 1100, quality: 78, note: 'events content image' },
  { file: 'Ocean.webp', maxWidth: 1400, quality: 78, note: 'benefits feature image' },
  { file: 'Relaxed3.webp', maxWidth: 2000, quality: 78, note: 'wide decorative banner' },
  { file: 'Landscape.webp', maxWidth: 1536, quality: 78, note: 'shared page hero background' }
];

async function run() {
  let before = 0;
  let after = 0;
  const rows = [];

  for (const t of TARGETS) {
    const abs = path.join(ROOT, t.file);
    if (!fs.existsSync(abs)) {
      rows.push([t.file, 'MISSING', '', '', '']);
      continue;
    }

    const input = fs.readFileSync(abs);
    const meta = await sharp(input).metadata();

    let pipeline = sharp(input);
    if (meta.width > t.maxWidth) {
      pipeline = pipeline.resize({ width: t.maxWidth, withoutEnlargement: true });
    }
    const output = await pipeline.webp({ quality: t.quality, effort: 6 }).toBuffer();

    const outMeta = await sharp(output).metadata();
    const saved = input.length - output.length;

    before += input.length;
    // Never write a file we made bigger.
    const keep = saved > 0;
    after += keep ? output.length : input.length;

    if (keep && !DRY) fs.writeFileSync(abs, output);

    rows.push([
      t.file,
      `${meta.width}x${meta.height}`,
      keep ? `${outMeta.width}x${outMeta.height}` : '(unchanged)',
      `${(input.length / 1024).toFixed(0)}KB`,
      keep ? `${(output.length / 1024).toFixed(0)}KB  -${((saved / input.length) * 100).toFixed(0)}%` : '-'
    ]);
  }

  console.log(DRY ? '(dry run — nothing written)\n' : '');
  console.log(
    'file'.padEnd(34), 'from'.padStart(11), 'to'.padStart(12), 'was'.padStart(7), 'now'.padStart(14)
  );
  rows.forEach((r) => console.log(
    r[0].padEnd(34), String(r[1]).padStart(11), String(r[2]).padStart(12), String(r[3]).padStart(7), String(r[4]).padStart(14)
  ));
  console.log(
    '\ntotal:', (before / 1024).toFixed(0) + 'KB', '->', (after / 1024).toFixed(0) + 'KB',
    `(-${(((before - after) / before) * 100).toFixed(0)}%)`
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
