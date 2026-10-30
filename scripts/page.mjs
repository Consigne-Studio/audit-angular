// Page de vente autonome (polices et images intégrées).
//   node scripts/page.mjs                        aperçu : vente/dist/page.html (mentions légales non renseignées)
//   node scripts/page.mjs --publication <dossier> site prêt pour Cloudflare Pages dans <dossier>/site/
//     (index.html, cgv.html, cgv.pdf) et CGV livrées dans <dossier>/livrables/audit-angular-cgv.pdf.
//     Lit STUDIO_NOM_LEGAL, STUDIO_SIRET, STUDIO_ADRESSE_PRO, STUDIO_TELEPHONE et STUDIO_SUPPORT_EMAIL
//     dans l'environnement, et refuse tant que l'une manque. Les CGV sont lues dans <dossier>/cgv.md.
//   node scripts/page.mjs --cgv-modele <dossier>  CGV en HTML gardant les {{STUDIO_…}} : fichier livré « modèle »
//     sur Gumroad (<dossier>/livrables/audit-angular-cgv.html), rempli par launch/publier.mjs à l'envoi.
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imprimerMarkdown } from './instructions.mjs';

const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const URL_PAGE = 'https://audit-angular.pages.dev/';
const VARIABLES = { NOM_LEGAL: 'STUDIO_NOM_LEGAL', SIRET: 'STUDIO_SIRET', ADRESSE: 'STUDIO_ADRESSE_PRO', TELEPHONE: 'STUDIO_TELEPHONE', EMAIL: 'STUDIO_SUPPORT_EMAIL' };
const b64 = async (rel, type) => `data:${type};base64,${(await readFile(path.join(R, rel))).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function assembler(mentions, base) {
  let html = await readFile(path.join(R, 'vente', 'page.html'), 'utf8');
  const rempl = {
    __ARCHIVO__: await b64('polices/Archivo-var.woff2', 'font/woff2'),
    __MARTIAN__: await b64('polices/MartianMono-var.woff2', 'font/woff2'),
    __ATKINSON__: await b64('polices/AtkinsonHyperlegibleNext-var.woff2', 'font/woff2'),
    __BASE__: base,
  };
  for (const p of [1, 2, 5, 6, 12]) rempl[`__IMG_P${p}__`] = await b64(`docs/rapport-p${p}.jpg`, 'image/jpeg');
  for (const [k, v] of Object.entries(mentions)) rempl[`__${k}__`] = esc(v);
  for (const [k, v] of Object.entries(rempl)) html = html.split(k).join(v);
  const reste = html.match(/__[A-Z0-9_]+__/);
  if (reste) throw new Error(`Marqueur non remplacé : ${reste[0]}`);
  return html;
}

const complet = (html) => {
  const [tete, corps] = html.split(/(?=<header)/);
  return `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${tete}</head>\n<body>\n${corps}\n</body>\n</html>\n`;
};

const args = process.argv.slice(2);
const i = args.indexOf('--publication');
const j = args.indexOf('--cgv-modele');
if (j >= 0) {
  const dossier = path.resolve(args[j + 1] ?? '');
  await mkdir(path.join(dossier, 'livrables'), { recursive: true });
  const { pdf } = await imprimerMarkdown(path.join(dossier, 'cgv.md'), path.join(dossier, 'livrables', 'audit-angular-cgv.pdf'), 'Conditions générales de vente');
  await rm(pdf);
  console.log('CGV modèle : livrables/audit-angular-cgv.html');
} else if (i < 0) {
  const apercu = Object.fromEntries(Object.keys(VARIABLES).map((k) => [k, k === 'EMAIL' ? 'adresse de support' : 'renseigné à la mise en ligne']));
  const html = await assembler(apercu, URL_PAGE);
  await mkdir(path.join(R, 'vente', 'dist'), { recursive: true });
  await writeFile(path.join(R, 'vente', 'dist', 'page.html'), html);
  console.log(`aperçu : vente/dist/page.html (${Math.round(html.length / 1024)} Ko)`);
} else {
  const dossier = path.resolve(args[i + 1] ?? '');
  const manquent = Object.values(VARIABLES).filter((v) => !process.env[v]?.trim());
  if (manquent.length) { console.error(`Variables manquantes : ${manquent.join(', ')} (LANCEMENT.md, étape 1).`); process.exit(1); }
  const mentions = Object.fromEntries(Object.entries(VARIABLES).map(([k, v]) => [k, process.env[v].trim()]));
  const site = path.join(dossier, 'site');
  await rm(site, { recursive: true, force: true });
  await mkdir(site, { recursive: true });
  await writeFile(path.join(site, 'index.html'), complet(await assembler(mentions, '')));
  const valeurs = { STUDIO_NOM_LEGAL: mentions.NOM_LEGAL, STUDIO_SIRET: mentions.SIRET, STUDIO_ADRESSE_PRO: mentions.ADRESSE, STUDIO_TELEPHONE: mentions.TELEPHONE, STUDIO_SUPPORT_EMAIL: mentions.EMAIL };
  const remplacer = (t) => {
    const r = t.replace(/\{\{(STUDIO_[A-Z_]+)\}\}/g, (m, k) => valeurs[k] ?? m);
    const reste = r.match(/\{\{[^}]+\}\}|\[[A-ZÉÈ ]{4,}\]/);
    if (reste) throw new Error(`CGV : « ${reste[0]} » non renseigné`);
    return r;
  };
  await imprimerMarkdown(path.join(dossier, 'cgv.md'), path.join(site, 'cgv.pdf'), 'Conditions générales de vente', remplacer);
  await mkdir(path.join(dossier, 'livrables'), { recursive: true });
  await copyFile(path.join(site, 'cgv.pdf'), path.join(dossier, 'livrables', 'audit-angular-cgv.pdf'));
  console.log(`site : ${path.relative(process.cwd(), site)}/ (index.html, cgv.html, cgv.pdf) ; CGV livrées : livrables/audit-angular-cgv.pdf`);
}
