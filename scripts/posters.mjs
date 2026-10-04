// Captures a still of every work into posters/, so the gallery shows something
// before a frame goes live. Pass file stems to refresh only those works.
// Needs a Playwright browser: npx playwright install chromium
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const only = process.argv.slice(2);
const files = (await readdir(`${root}works`))
  .filter((file) => file.endsWith('.html'))
  .filter((file) => !only.length || only.includes(file.replace(/\.html$/, '')));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
for (const file of files) {
  await page.goto(`file://${root}works/${file}`);
  // Let build-up effects get going before the still is taken.
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${root}posters/${file.replace(/\.html$/, '.jpg')}`, type: 'jpeg', quality: 82 });
  console.log(file);
}
await browser.close();
