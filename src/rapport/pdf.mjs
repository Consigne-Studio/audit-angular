// Impression PDF du rapport HTML avec Chromium (Playwright, dépendance facultative).
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export async function imprimerPdf(htmlFichier, pdfFichier) {
  let pw;
  try { pw = await import('playwright'); } catch {
    try { pw = createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright'); } catch {
      throw new Error('--pdf demande Playwright : `npm i -D playwright && npx playwright install chromium`, ou ouvrez rapport.html et imprimez-le en PDF.');
    }
  }
  const chromium = pw.chromium ?? pw.default?.chromium;
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlFichier).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: pdfFichier, format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}
