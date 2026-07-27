/* Self-hosts the brand fonts for the design-sync bundle.
 *
 * Production loads Inter + Inter Tight through next/font/google, which
 * self-hosts them at build time. The design-sync bundle has no Next build, so
 * without this the `font-sans`/`font-heading` utilities resolve to an undefined
 * custom property and every card renders in a browser default face.
 *
 * Downloads the woff2 files Google serves and emits a local @font-face sheet
 * that cfg.extraFonts points at. Re-run only when the font set changes.
 *
 *   node .design-sync/fetch-fonts.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'web', '.ds-fonts');

// A modern UA is required — Google serves ttf to unrecognised clients.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FAMILIES = [
  { name: 'Inter', spec: 'Inter:wght@100..900', slug: 'inter' },
  { name: 'Inter Tight', spec: 'Inter+Tight:wght@100..900', slug: 'inter-tight' },
];

mkdirSync(OUT, { recursive: true });

const sheets = [];

for (const { name, spec, slug } of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${res.statusText}`);
  let css = await res.text();

  // Keep only latin + latin-ext; the other subsets triple the payload for
  // glyphs this product never renders.
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)].filter(
    ([, subset]) => subset === 'latin' || subset === 'latin-ext',
  );
  if (!blocks.length) throw new Error(`${name}: no latin @font-face blocks found`);

  let i = 0;
  const out = [];
  for (const [, subset, face] of blocks) {
    const src = /url\((https:[^)]+\.woff2)\)/.exec(face);
    if (!src) continue;
    const file = `${slug}-${subset}-${i++}.woff2`;
    const bin = await fetch(src[1], { headers: { 'User-Agent': UA } });
    if (!bin.ok) throw new Error(`${file}: ${bin.status}`);
    writeFileSync(join(OUT, file), Buffer.from(await bin.arrayBuffer()));
    out.push(face.replace(src[1], `./${file}`));
    console.log(`  ${file}`);
  }
  sheets.push(`/* ${name} — self-hosted, mirrors next/font/google in the app */\n${out.join('\n')}`);
}

writeFileSync(join(OUT, 'fonts.css'), sheets.join('\n\n') + '\n');
console.log(`\n✓ wrote ${join(OUT, 'fonts.css')}`);
