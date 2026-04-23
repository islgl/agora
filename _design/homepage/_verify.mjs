import { chromium } from '/Users/lgl/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const url  = 'file://' + path.join(here, 'Agora Homepage.html');

const outDir = path.join(here, '_shots');
fs.mkdirSync(outDir, { recursive: true });

const breakpoints = [
  { name: 'desktop',  w: 1440, h: 900  },
  { name: 'laptop',   w: 1280, h: 800  },
  { name: 'tablet',   w: 768,  h: 1024 },
];

const browser = await chromium.launch();

for (const mode of ['light', 'dark']) {
  for (const bp of breakpoints) {
    const ctx = await browser.newContext({
      viewport: { width: bp.w, height: bp.h },
      deviceScaleFactor: 2,
      colorScheme: mode === 'dark' ? 'dark' : 'light',
    });
    const page = await ctx.newPage();

    // Surface any console errors
    const errors = [];
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') {
        errors.push(`[${m.type()}] ${m.text()}`);
      }
    });

    // Inject theme into window before any page script runs — the pre-mount
    // resolver in <head> picks it up on first paint, React's useState(init)
    // reads the same value synchronously, so first render is correct.
    await page.addInitScript((m) => {
      window.__agoraInitialTheme = m;
    }, mode);

    await page.goto(url, { waitUntil: 'networkidle' });

    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(900); // Babel compile + React mount
    await page.waitForSelector('text=Brand Layer', { timeout: 6000 });

    // Sanity log — confirms theme is applied.
    const applied = await page.evaluate(() => ({
      htmlClass: document.documentElement.className,
      initTheme: window.__agoraInitialTheme,
      bgColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    }));
    console.log(`  → theme=${mode}:`, applied);

    // Disable scroll reveals so the full-page capture shows everything.
    // Injected as <style> so React's className diff can't overwrite it.
    await page.addStyleTag({
      content: `.reveal { opacity: 1 !important; transform: none !important; transition: none !important; }`,
    });
    await page.waitForTimeout(400);

    // Full page screenshot (captures whole scroll)
    const full = path.join(outDir, `${mode}-${bp.name}-full.png`);
    await page.screenshot({ path: full, fullPage: true });

    // Viewport hero shot
    const vp = path.join(outDir, `${mode}-${bp.name}-hero.png`);
    await page.screenshot({ path: vp, fullPage: false });

    console.log(`✓ ${mode}/${bp.name}: ${full} (${errors.length} errors)`);
    if (errors.length) errors.forEach((e) => console.log('   ', e));
    await ctx.close();
  }
}
await browser.close();
console.log('Done. Shots in:', outDir);
