import { chromium } from '/Users/lgl/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here   = path.dirname(fileURLToPath(import.meta.url));
const url    = 'file://' + path.join(here, 'Agora Homepage.html');
const outDir = path.join(here, '_shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

// Zoomed crops of individual sections, both themes, to inspect details.
const sections = [
  { id: 'top',     label: 'hero'     },
  { id: 'inside',  label: 'layers'   },
  { id: 'local',   label: 'local'    },
  { id: 'install', label: 'install'  },
];

for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.addInitScript((m) => { window.__agoraInitialTheme = m; }, mode);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(900);
  await page.waitForSelector('text=Brand Layer', { timeout: 6000 });
  await page.addStyleTag({
    content: `.reveal { opacity: 1 !important; transform: none !important; transition: none !important; }`,
  });
  await page.waitForTimeout(300);

  for (const s of sections) {
    const locator = page.locator(`#${s.id}`);
    const file = path.join(outDir, `zoom-${mode}-${s.label}.png`);
    await locator.screenshot({ path: file });
    console.log(`✓ ${file}`);
  }
  await ctx.close();
}
await browser.close();
