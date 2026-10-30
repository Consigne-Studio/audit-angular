#!/usr/bin/env node
// audit-angular : audit statique en lecture seule d'une application Angular.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { auditer, ajouterComplements } from '../src/index.mjs';
import { rapportHtml } from '../src/rapport/html.mjs';
import { rapportMd } from '../src/rapport/md.mjs';
import { lireRevue } from '../src/rapport/markdown.mjs';
import { ticketsCsv } from '../src/rapport/tickets.mjs';

const AIDE = `Usage : audit-angular [dossier] [options]

Analyse en lecture seule le dépôt Angular (dossier courant par défaut) et écrit :
  audit.json     mesures et constats, sans code source (c'est ce fichier qu'on envoie à l'auditeur)
  rapport.html   rapport lisible et imprimable (A4)
  rapport.md     même contenu en Markdown

Options :
  -o, --sortie <dossier>   dossier de sortie (défaut : ./audit-angular)
      --revue <fichier>    revue de l'auditeur (modele/revue.md) à intégrer au rapport
      --depuis <json>      refaire le rapport depuis un audit.json existant, sans relire le code
      --complements <dos.> ajouter les mesures dynamiques : sorties JSON de npm audit, ng build --stats-json, Lighthouse
      --sans-chemins       ne pas inclure les chemins de fichiers dans audit.json et les rapports
      --date <AAAA-MM-JJ>  date de référence (calendrier de support), défaut : aujourd'hui
      --pdf                imprimer aussi rapport.pdf (demande Playwright et Chromium)
      --tickets            exporter aussi tickets.csv (lots et constats, import Jira / GitLab)
      --seuil <n>          code de sortie 2 si l'indice global est sous n (usage en CI)
  -q, --silencieux         pas de résumé dans le terminal
  -h, --aide               cette aide
  -v, --version            version de l'outil`;

let opts;
try {
  opts = parseArgs({
    allowPositionals: true,
    options: {
      sortie: { type: 'string', short: 'o' }, revue: { type: 'string' }, depuis: { type: 'string' }, complements: { type: 'string' },
      'sans-chemins': { type: 'boolean' }, date: { type: 'string' }, pdf: { type: 'boolean' }, tickets: { type: 'boolean' },
      seuil: { type: 'string' }, silencieux: { type: 'boolean', short: 'q' },
      aide: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
    },
  });
} catch (err) {
  console.error(`${err.message}\n\n${AIDE}`);
  process.exit(64);
}
const { values: o, positionals } = opts;
if (o.aide) { console.log(AIDE); process.exit(0); }
if (o.version) { console.log(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version); process.exit(0); }
if (o.date && !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) { console.error('--date attend AAAA-MM-JJ'); process.exit(64); }

try {
  const dossier = positionals[0] ?? '.';
  const sortie = path.resolve(o.sortie ?? 'audit-angular');
  const audit = o.depuis
    ? JSON.parse(await readFile(o.depuis, 'utf8'))
    : await auditer(dossier, { date: o.date, sansChemins: o['sans-chemins'] });
  if (o.complements) {
    const { ignores } = await ajouterComplements(audit, o.complements);
    if (ignores.length && !o.silencieux) console.warn(`Fichiers non reconnus dans ${o.complements} : ${ignores.join(', ')}`);
  }
  if (o['sans-chemins']) for (const f of audit.findings) f.emplacements = [];
  const revue = o.revue ? lireRevue(await readFile(o.revue, 'utf8')) : {};

  await mkdir(sortie, { recursive: true });
  await writeFile(path.join(sortie, 'audit.json'), JSON.stringify(audit, null, 2) + '\n');
  const html = await rapportHtml(audit, revue);
  await writeFile(path.join(sortie, 'rapport.html'), html);
  await writeFile(path.join(sortie, 'rapport.md'), rapportMd(audit, revue));
  if (o.tickets) await writeFile(path.join(sortie, 'tickets.csv'), ticketsCsv(audit));
  if (o.pdf) {
    const { imprimerPdf } = await import('../src/rapport/pdf.mjs');
    await imprimerPdf(path.join(sortie, 'rapport.html'), path.join(sortie, 'rapport.pdf'));
  }

  if (!o.silencieux) {
    const n = (s) => audit.findings.filter((f) => f.severity === s).length;
    console.log(`Angular ${audit.angular.version ?? '?'} · indice global ${audit.scores.global}/100 · P1 ${n('P1')} · P2 ${n('P2')} · P3 ${n('P3')} · P4 ${n('P4')}`);
    console.log(`Migration estimée : ${audit.estimation.total.bas} à ${audit.estimation.total.haut} jours`);
    console.log(`Rapport : ${path.join(sortie, 'rapport.html')}`);
  }
  if (o.seuil && audit.scores.global < Number(o.seuil)) process.exit(2);
} catch (err) {
  console.error(`audit-angular : ${err.message}`);
  process.exit(1);
}
