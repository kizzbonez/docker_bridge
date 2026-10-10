// Renders the PNG brand exports from the SVG mark, using the real webfonts.
//
//   npm run brand
//
// Outputs to public/brand: app icons, a transparent logo lockup and the
// 1200x630 social card. The SVG files in that folder are the source of truth.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
// Fonts are embedded as data: URIs so the page needs no file or network access.
const font = async (pkg, file) => {
  const bytes = await readFile(root(`node_modules/@fontsource-variable/${pkg}/files/${file}`));
  return `data:font/woff2;base64,${bytes.toString('base64')}`;
};
const OUT = root('public/brand/');

const mark = (await readFile(`${OUT}logo-mark.svg`, 'utf8')).replace(/<title[^>]*>.*?<\/title>/, '');

const FONTS = `
  @font-face { font-family: Oxanium; font-weight: 200 800; src: url("${await font('oxanium', 'oxanium-latin-wght-normal.woff2')}"); }
  @font-face { font-family: Mono; font-weight: 100 800; src: url("${await font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')}"); }
  @font-face { font-family: Sans; font-weight: 400 700; src: url("${await font('instrument-sans', 'instrument-sans-latin-wght-normal.woff2')}"); }
`;

const LOCKUP = `
  <div class="lockup">
    <div class="mark">${mark}</div>
    <span class="word">Docker<b>Bridge</b></span>
    <span class="chip">MCP</span>
  </div>`;

const page = (body, css) => `<!doctype html><meta charset="utf-8"><style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; }
  body { background: transparent; color: #e6edf7; font-family: Sans, sans-serif; }
  .lockup { display: inline-flex; align-items: center; gap: 20px; }
  .mark svg { display: block; width: 100%; height: 100%; }
  .word { font-family: Oxanium; font-weight: 600; letter-spacing: 0.02em; }
  .word b { color: #38bdf8; font-weight: 600; }
  .chip { font-family: Mono; letter-spacing: 0.2em; color: #67e8f9; border: 2px solid rgb(6 182 212 / 0.5); border-radius: 8px; }
  ${css}
</style>${body}`;

const ICON_CSS = 'body { display: grid; place-items: center; height: 100vh; } .mark { width: 100vw; height: 100vh; }';

const LOCKUP_CSS = `
  body { padding: 24px; }
  .mark { width: 96px; height: 96px; }
  .word { font-size: 64px; }
  .chip { font-size: 22px; padding: 6px 12px; }`;

const CARD_CSS = `
  body { width: 1200px; height: 630px; padding: 72px 80px; background: #090d16;
    background-image: radial-gradient(rgb(56 189 248 / 0.16) 1.5px, transparent 1.5px),
      radial-gradient(ellipse 70% 60% at 50% 0%, rgb(6 182 212 / 0.2), transparent);
    background-size: 30px 30px, auto; display: flex; flex-direction: column; justify-content: space-between; }
  .mark { width: 72px; height: 72px; } .word { font-size: 44px; } .chip { font-size: 18px; padding: 5px 10px; }
  h1 { font-family: Oxanium; font-weight: 600; font-size: 76px; line-height: 1.04; letter-spacing: -0.01em; }
  h1 em { font-style: normal; color: #38bdf8; }
  p { font-size: 28px; color: #a9b8cc; max-width: 880px; line-height: 1.4; }
  footer { font-family: Mono; font-size: 20px; letter-spacing: 0.14em; color: #34d399; }`;

const CARD = `${LOCKUP}
  <div><h1>Autonomous Container Diagnostics for <em>Agentic Workflows</em></h1></div>
  <p>Token-efficient, safety-guarded Docker Engine debugging for any MCP client.</p>
  <footer>3 TOOLS · JSON-RPC 2.0 · READ-ONLY BY DEFAULT</footer>`;

const browser = await chromium.launch();

async function render(name, html, viewport, options = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: options.scale ?? 1 });
  const tab = await context.newPage();
  await tab.setContent(html, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const target = options.selector ? tab.locator(options.selector) : tab;
  await target.screenshot({ path: `${OUT}${name}`, omitBackground: options.transparent ?? false });
  await context.close();
}

for (const size of [180, 192, 512]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  await render(name, page(`<div class="mark">${mark}</div>`, ICON_CSS), { width: size, height: size }, { transparent: true });
}
await render('logo-lockup.png', page(LOCKUP, LOCKUP_CSS), { width: 900, height: 200 }, { selector: '.lockup', scale: 2, transparent: true });
await render('og-image.png', page(CARD, CARD_CSS), { width: 1200, height: 630 });

await browser.close();
console.log(`Brand assets written to ${OUT}`);
