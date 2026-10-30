import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditer } from '../src/index.mjs';
import { lireRevue, versHtml } from '../src/rapport/markdown.mjs';
import { rapportHtml } from '../src/rapport/html.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const FIX = (n) => path.join(ici, 'fixtures', n);
const DATE = '2026-10-23';
const ids = (a) => a.findings.map((f) => f.id);
const trouve = (a, id) => a.findings.find((f) => f.id === id);

test('projet legacy : versions et dépendances', async () => {
  const a = await auditer(FIX('legacy'), { date: DATE });
  assert.equal(a.angular.version, '15.2.10', 'version lue dans le lockfile, pas dans la plage');
  assert.equal(a.angular.major, 15);
  assert.equal(a.sourceVersions, 'package-lock.json');
  assert.equal(trouve(a, 'VER-001').severity, 'P1');
  assert.match(trouve(a, 'VER-004').detail, /@angular\/material 14\.2\.7/);
  assert.ok(trouve(a, 'VER-010'), 'RxJS 6');
  assert.ok(trouve(a, 'VER-011'), 'TypeScript 4');
  for (const id of ['DEP-tslint', 'DEP-protractor', 'DEP-moment']) assert.ok(ids(a).includes(id), id);
});

test('projet legacy : migration', async () => {
  const a = await auditer(FIX('legacy'), { date: DATE });
  const i = a.indicateurs;
  assert.equal(i.composants, 1);
  assert.equal(i.standalone, 0, 'standalone non déclaré = false avant la v19');
  assert.equal(i.ngModules, 1);
  assert.equal(i.controleFluxAncien, 3);
  assert.equal(trouve(a, 'MIG-003').count, 2);
  assert.equal(trouve(a, 'MIG-004').count, 1);
  assert.equal(i.injectionConstructeur, 3);
  assert.ok(trouve(a, 'MIG-006'), 'dépend de zone.js');
  assert.equal(trouve(a, 'MIG-006').emplacements[0].fichier, 'src/app/liste.component.ts');
});

test('projet legacy : sécurité, qualité, performance', async () => {
  const a = await auditer(FIX('legacy'), { date: DATE });
  assert.equal(trouve(a, 'SEC-001').emplacements[0].ligne, 14);
  assert.equal(trouve(a, 'SEC-002').count, 1);
  assert.equal(trouve(a, 'SEC-003').count, 1);
  assert.equal(trouve(a, 'SEC-005').count, 1);
  assert.equal(trouve(a, 'SEC-006').count, 1);
  assert.doesNotMatch(JSON.stringify(a), /sk_test_abcdefghijklmnop/, 'aucun secret recopié dans audit.json');
  assert.equal(trouve(a, 'SEC-007').count, 1);
  for (const id of ['QUA-001', 'QUA-002', 'QUA-004', 'QUA-005', 'QUA-008', 'QUA-009', 'QUA-010']) assert.ok(ids(a).includes(id), id);
  assert.ok(trouve(a, 'PER-001'));
  assert.ok(trouve(a, 'PER-002'));
  assert.ok(trouve(a, 'PER-003'));
  assert.ok(trouve(a, 'PER-004'), '1 route différée sur 5');
  assert.equal(trouve(a, 'PER-005').count, 1, 'un seul *ngFor sans trackBy');
  assert.equal(trouve(a, 'PER-008').count, 1);
  assert.ok(a.scores.global < 40);
  assert.deepEqual(a.findings.map((f) => f.severity), [...a.findings.map((f) => f.severity)].sort(), 'triés par priorité');
});

test('projet moderne : presque rien à signaler', async () => {
  const a = await auditer(FIX('moderne'), { date: DATE });
  const i = a.indicateurs;
  assert.equal(a.angular.version, '22.2.3', 'plage exacte quand le lockfile ne liste pas le paquet');
  assert.equal(i.pctStandalone, 100, 'standalone par défaut depuis la v19');
  assert.equal(i.pctOnPush, 100);
  assert.equal(i.pctControleFluxNouveau, 100);
  assert.equal(i.entreesSortiesSignals, 2);
  assert.equal(i.requetesSignals, 1);
  assert.equal(i.injectFonction, 1);
  assert.equal(i.defer, 1);
  assert.equal(i.zoneless, true);
  assert.equal(i.pctComposantsTestes, 100);
  assert.deepEqual(ids(a), [], `constats inattendus : ${ids(a).join(', ')}`);
  assert.equal(a.scores.global, 100);
  assert.equal(a.estimation.lots.length, 0);
});

test('calendrier de support : v20 passe hors support le 2026-11-28', async () => {
  const avant = await auditer(FIX('legacy'), { date: '2026-10-23' });
  assert.ok(avant);
  const { evaluer } = await import('../src/regles.mjs');
  const p = { angular: { version: '20.3.0', major: 20 }, dependances: [], versions: {}, sourceVersions: 'x', tsconfig: { strict: true, strictTemplates: true }, angularJson: false, outillage: { eslint: true, ci: ['x'], playwright: true }, budgets: [], prod: {}, assetsLourds: [] };
  assert.equal(evaluer(p, [], [], [], { date: '2026-10-23' }).constats.find((c) => c.id === 'VER-002').severity, 'P2');
  assert.equal(evaluer(p, [], [], [], { date: '2026-11-29' }).constats.find((c) => c.id === 'VER-001').severity, 'P1');
});

test('estimation : fourchette cohérente et justifiée', async () => {
  const a = await auditer(FIX('legacy'), { date: DATE });
  assert.ok(a.estimation.total.bas > 0 && a.estimation.total.haut >= a.estimation.total.bas);
  for (const l of a.estimation.lots) {
    assert.ok(l.haut >= l.bas, l.id);
    assert.ok(l.base.length > 5, `${l.id} sans base de calcul`);
    assert.equal(l.bas * 2 % 1, 0, 'arrondi à la demi-journée');
  }
  assert.ok(a.estimation.lots.some((l) => l.id === 'montee'));
});

test('audit.json respecte le schéma publié', async () => {
  const a = await auditer(FIX('legacy'), { date: DATE });
  const schema = JSON.parse(await readFile(path.join(ici, '..', 'schema', 'audit.schema.json'), 'utf8'));
  for (const k of schema.required) assert.ok(k in a, `champ requis ${k}`);
  for (const k of schema.properties.findings.items.required) assert.ok(a.findings.every((f) => k in f), `findings[].${k}`);
  for (const k of schema.properties.dependencies.items.required) assert.ok(a.dependencies.every((d) => k in d), `dependencies[].${k}`);
  assert.ok(a.findings.every((f) => schema.properties.findings.items.properties.severity.enum.includes(f.severity)));
});

test('revue de l\'auditeur : sections et remarques', () => {
  const r = lireRevue('## Client\nACME\n\n## Synthèse\nTexte **gras**.\n\n## Remarques par constat\n- SEC-001 : faux positif, valeur constante.\n- VER-001: à faire\n');
  assert.equal(r.client, 'ACME');
  assert.equal(r.remarques['SEC-001'], 'faux positif, valeur constante.');
  assert.equal(r.remarques['VER-001'], 'à faire');
  assert.match(versHtml(r.synthese), /<strong>gras<\/strong>/);
  assert.equal(versHtml('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('rapport HTML autonome, échappé, avec la revue', async () => {
  const a = await auditer(FIX('legacy'), { date: DATE });
  a.projet.nom = '<img src=x onerror=alert(1)>';
  const html = await rapportHtml(a, { remarques: { 'SEC-001': 'Avis **testé**' } });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /Avis <strong>testé<\/strong>/);
  assert.doesNotMatch(html, /https?:\/\/(?!angular\.dev)[^"'\s)]*\.(css|js|woff2?)/, 'aucune ressource externe');
  assert.match(html, /font\/woff2;base64/);
});

test('CLI : écrit les trois fichiers, --sans-chemins, --seuil', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'audit-'));
  const bin = path.join(ici, '..', 'bin', 'audit-angular.mjs');
  const run = promisify(execFile);
  const { stdout } = await run(process.execPath, [bin, FIX('legacy'), '-o', out, '--date', DATE, '--sans-chemins']);
  assert.match(stdout, /Angular 15\.2\.10 · indice global \d+\/100/);
  assert.deepEqual((await readdir(out)).sort(), ['audit.json', 'rapport.html', 'rapport.md']);
  const a = JSON.parse(await readFile(path.join(out, 'audit.json'), 'utf8'));
  assert.ok(a.findings.every((f) => f.emplacements.length === 0));
  assert.doesNotMatch(await readFile(path.join(out, 'rapport.html'), 'utf8'), /liste\.component\.ts/);
  await assert.rejects(run(process.execPath, [bin, FIX('legacy'), '-o', out, '-q', '--seuil', '90']), (e) => e.code === 2);
  await assert.rejects(run(process.execPath, [bin, path.join(ici, 'fixtures'), '-o', out, '-q']), (e) => e.code === 1 && /package\.json/.test(e.stderr));
  await run(process.execPath, [bin, FIX('legacy'), '-o', out, '-q', '--tickets', '--date', DATE]);
  const csv = await readFile(path.join(out, 'tickets.csv'), 'utf8');
  assert.match(csv, /^\uFEFFSummary,Description,Priority/);
  assert.match(csv, /\[SEC-001\][^\r]*Highest/);
  const { stdout: v } = await run(process.execPath, [bin, '--version']);
  assert.match(v, /^\d+\.\d+\.\d+/);
});

test('mesures dynamiques : npm audit, stats esbuild, Lighthouse', async () => {
  const { ajouterComplements } = await import('../src/index.mjs');
  const a = await auditer(FIX('moderne'), { date: DATE });
  const { ignores } = await ajouterComplements(a, FIX('complements'));
  assert.deepEqual(ignores, ['inconnu.json']);
  assert.deepEqual(a.mesures.npmAudit.totaux.critical, 1);
  assert.equal(a.mesures.npmAudit.paquets[0].nom, 'lodash', 'triés par gravité');
  assert.equal(trouve(a, 'SEC-101').severity, 'P1');
  assert.equal(trouve(a, 'SEC-101').count, 2);
  assert.equal(a.mesures.stats.jsInitialKo, 1406);
  assert.equal(trouve(a, 'PER-101').severity, 'P3');
  assert.equal(trouve(a, 'PER-102').severity, 'P2', 'perf 42 < 50');
  assert.ok(a.scores.securite < 100 && a.scores.performance < 100);
  const html = await rapportHtml(a);
  assert.match(html, /Mesures sur l'application/);
  assert.match(html, /recette\.exemple\.fr\/accueil/);
  await ajouterComplements(a, FIX('complements'));
  assert.equal(a.findings.filter((f) => f.id === 'SEC-101').length, 1, 'idempotent');
});
