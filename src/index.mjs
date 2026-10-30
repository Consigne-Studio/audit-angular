// Point d'entrée : auditer(dossier) → objet audit (sérialisé en audit.json, voir schema/audit.schema.json).
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { listerFichiers, lireTexte } from './collecte.mjs';
import { lireProjet } from './projet.mjs';
import { analyserTs } from './analyse-ts.mjs';
import { analyserGabarit } from './analyse-gabarit.mjs';
import { evaluer, DERNIERE_MAJEURE } from './regles.mjs';
import { estimer } from './estimation.mjs';
import { lireComplements, constatsComplements } from './complements.mjs';

export const AXES = {
  versions: 'Versions et dépendances',
  migration: 'Préparation signals et v' + DERNIERE_MAJEURE,
  qualite: 'Qualité et tests',
  securite: 'Sécurité',
  performance: 'Performance',
};
export const PENALITE = { P1: 25, P2: 12, P3: 5, P4: 2 };
const ORDRE = { P1: 0, P2: 1, P3: 2, P4: 3 };

const VERSION_OUTIL = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

export function noter(constats) {
  const scores = {};
  for (const axe of Object.keys(AXES)) {
    const pen = constats.filter((c) => c.axe === axe).reduce((s, c) => s + PENALITE[c.severity], 0);
    scores[axe] = Math.max(0, 100 - pen);
  }
  // Global : moyenne pondérée (versions et sécurité comptent double : ce sont les risques).
  const poids = { versions: 2, migration: 1, qualite: 1, securite: 2, performance: 1 };
  const tot = Object.values(poids).reduce((a, b) => a + b, 0);
  scores.global = Math.round(Object.entries(poids).reduce((s, [k, w]) => s + scores[k] * w, 0) / tot);
  return scores;
}

/** Ajoute à un audit les mesures dynamiques (npm audit, stats de build, Lighthouse) lues dans `dossier`. */
export async function ajouterComplements(audit, dossier) {
  const c = await lireComplements(dossier);
  const nouveaux = constatsComplements(c);
  const ids = new Set(nouveaux.map((f) => f.id));
  audit.findings = [...audit.findings.filter((f) => !ids.has(f.id) && !/^(SEC-10[12]|PER-10[12])$/.test(f.id)), ...nouveaux]
    .sort((a, b) => ORDRE[a.severity] - ORDRE[b.severity] || a.id.localeCompare(b.id));
  audit.scores = noter(audit.findings);
  audit.mesures = { npmAudit: c.npmAudit, stats: c.stats, lighthouse: c.lighthouse };
  return { audit, ignores: c.ignores };
}

/**
 * @param {string} dossier racine du dépôt Angular
 * @param {{date?: string, sansChemins?: boolean}} [opts]
 */
export async function auditer(dossier, opts = {}) {
  const racine = path.resolve(dossier);
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const fichiers = await listerFichiers(racine);
  const projet = await lireProjet(racine, fichiers);

  const tsFichiers = fichiers.filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
  const estTest = (f) => /\.(spec|test|e2e-spec)\.ts$/.test(f) || /(^|\/)e2e\//.test(f);
  const ts = [];
  const specs = [];
  const gab = [];
  for (const f of tsFichiers) {
    const texte = await lireTexte(racine, f);
    if (texte == null) continue;
    const faits = analyserTs(f, texte);
    if (estTest(f)) { specs.push(faits); continue; }
    ts.push(faits);
    for (const t of faits.templatesInline) gab.push(analyserGabarit(f, t.texte, t.ligne - 1));
  }
  for (const f of fichiers.filter((x) => x.endsWith('.html') && !/(^|\/)index\.html$/.test(x) && !/(^|\/)(e2e|public)\//.test(x))) {
    const texte = await lireTexte(racine, f);
    if (texte != null) gab.push(analyserGabarit(f, texte));
  }

  const { constats, indicateurs } = evaluer(projet, ts, specs, gab, { date });
  constats.sort((a, b) => ORDRE[a.severity] - ORDRE[b.severity] || a.id.localeCompare(b.id));
  const scores = noter(constats);
  const estimation = estimer(projet, indicateurs, constats);

  const audit = {
    $schema: 'https://consigne.dev/schemas/audit-angular-1.json',
    outil: { nom: 'audit-angular', version: VERSION_OUTIL },
    date,
    projet: { nom: projet.nom, fichiers: fichiers.length },
    angular: projet.angular,
    versions: projet.versions,
    sourceVersions: projet.sourceVersions,
    configuration: {
      builder: projet.builder, testBuilder: projet.testBuilder, budgets: projet.budgets, prod: projet.prod,
      tsconfig: projet.tsconfig, outillage: projet.outillage,
    },
    dependencies: projet.dependances.map(({ name, version, dev }) => ({ name, version, dev })),
    indicateurs,
    scores,
    findings: constats.map((c) => ({
      id: c.id, severity: c.severity, axe: c.axe, title: c.title, detail: c.detail, recommandation: c.reco, count: c.count,
      emplacements: opts.sansChemins ? [] : c.emplacements,
    })),
    estimation,
  };
  return audit;
}
