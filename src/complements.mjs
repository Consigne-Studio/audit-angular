// Mesures dynamiques fournies par le client (formules Standard et Migration) : sorties JSON de
// `npm audit --json`, `ng build --stats-json` et Lighthouse. Lues depuis un dossier, jamais exécutées ici.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ko = (o) => Math.round(o / 1024);
const ORDRE = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };

export function lireNpmAudit(j) {
  const vulns = Object.values(j.vulnerabilities ?? {});
  if (!vulns.length && !j.metadata?.vulnerabilities) return null;
  const directs = vulns.filter((v) => v.isDirect);
  return {
    totaux: j.metadata?.vulnerabilities ?? vulns.reduce((t, v) => ({ ...t, [v.severity]: (t[v.severity] ?? 0) + 1 }), {}),
    paquets: vulns
      .map((v) => ({ nom: v.name, severite: v.severity, direct: !!v.isDirect, correctif: v.fixAvailable === true ? 'oui' : v.fixAvailable ? `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? ' (majeure)' : ''}` : 'non' }))
      .sort((a, b) => ORDRE[a.severite] - ORDRE[b.severite] || a.nom.localeCompare(b.nom)),
    directs: directs.length,
  };
}

// esbuild (constructeur application : outputs) ou webpack (assets / chunks).
export function lireStats(j) {
  let fichiers = [];
  if (j.outputs) fichiers = Object.entries(j.outputs).map(([f, o]) => ({ fichier: f, octets: o.bytes, initial: !!o.entryPoint }));
  else if (Array.isArray(j.assets)) {
    const initiaux = new Set((j.chunks ?? []).filter((c) => c.initial).flatMap((c) => c.files ?? []));
    fichiers = j.assets.map((a) => ({ fichier: a.name, octets: a.size, initial: initiaux.has(a.name) }));
  } else return null;
  const js = fichiers.filter((f) => /\.m?js$/.test(f.fichier)).sort((a, b) => b.octets - a.octets);
  const css = fichiers.filter((f) => /\.css$/.test(f.fichier));
  return {
    jsKo: ko(js.reduce((s, f) => s + f.octets, 0)),
    jsInitialKo: ko(js.filter((f) => f.initial).reduce((s, f) => s + f.octets, 0)),
    cssKo: ko(css.reduce((s, f) => s + f.octets, 0)),
    morceaux: js.length,
    plusGros: js.slice(0, 8).map((f) => ({ fichier: path.basename(f.fichier), ko: ko(f.octets), initial: f.initial })),
  };
}

export function lireLighthouse(j) {
  if (!j.categories || !j.audits) return null;
  const v = (id) => j.audits[id]?.numericValue ?? null;
  const pct = (c) => (j.categories[c]?.score == null ? null : Math.round(j.categories[c].score * 100));
  return {
    url: j.finalDisplayedUrl ?? j.finalUrl ?? j.requestedUrl ?? '?',
    performance: pct('performance'), accessibilite: pct('accessibility'), bonnesPratiques: pct('best-practices'),
    lcp: v('largest-contentful-paint'), cls: v('cumulative-layout-shift'), tbt: v('total-blocking-time'), fcp: v('first-contentful-paint'),
  };
}

/** Lit tous les .json du dossier et reconnaît leur type à leur contenu. */
export async function lireComplements(dossier) {
  const res = { npmAudit: null, stats: null, lighthouse: [], ignores: [] };
  for (const n of (await readdir(dossier)).filter((f) => f.endsWith('.json')).sort()) {
    let j;
    try { j = JSON.parse(await readFile(path.join(dossier, n), 'utf8')); } catch { res.ignores.push(n); continue; }
    if (j.auditReportVersion || j.vulnerabilities) res.npmAudit = lireNpmAudit(j);
    else if (j.outputs || j.assets) res.stats = lireStats(j);
    else if (j.lighthouseVersion) { const l = lireLighthouse(j); if (l) res.lighthouse.push(l); }
    else res.ignores.push(n);
  }
  return res;
}

/** Constats issus des mesures dynamiques. */
export function constatsComplements(c) {
  const C = [];
  const a = c.npmAudit;
  if (a) {
    const t = a.totaux;
    const crit = (t.critical ?? 0) + (t.high ?? 0);
    const liste = a.paquets.slice(0, 25).map((p) => ({ fichier: p.nom, ligne: null, info: `${p.severite}${p.direct ? ', direct' : ''}, correctif : ${p.correctif}` }));
    if (crit) C.push({ id: 'SEC-101', axe: 'securite', severity: 'P1', title: `${crit} vulnérabilité(s) critique(s) ou haute(s) dans les dépendances`, detail: `npm audit : ${t.critical ?? 0} critique(s), ${t.high ?? 0} haute(s), ${t.moderate ?? 0} modérée(s), ${t.low ?? 0} faible(s).`, recommandation: 'Appliquer les correctifs disponibles (`npm audit fix`, sans --force) ; pour les autres, la montée de version d\'Angular et des bibliothèques est le correctif.', count: crit, emplacements: liste });
    else if ((t.moderate ?? 0) + (t.low ?? 0)) C.push({ id: 'SEC-102', axe: 'securite', severity: 'P3', title: `${(t.moderate ?? 0) + (t.low ?? 0)} vulnérabilité(s) modérée(s) ou faible(s) dans les dépendances`, detail: `npm audit : ${t.moderate ?? 0} modérée(s), ${t.low ?? 0} faible(s).`, recommandation: 'Appliquer les correctifs disponibles lors de la prochaine montée de dépendances.', count: (t.moderate ?? 0) + (t.low ?? 0), emplacements: liste });
  }
  const s = c.stats;
  if (s && s.jsInitialKo > 1024) C.push({ id: 'PER-101', axe: 'performance', severity: s.jsInitialKo > 2048 ? 'P2' : 'P3', title: `${s.jsInitialKo} Ko de JavaScript au chargement initial`, detail: `${s.jsKo} Ko de JavaScript au total en ${s.morceaux} fichier(s) (tailles avant compression).`, recommandation: 'Différer les fonctionnalités (loadComponent, @defer), retirer les bibliothèques lourdes du bundle initial, vérifier les imports complets.', count: 1, emplacements: s.plusGros.map((f) => ({ fichier: f.fichier, ligne: null, info: `${f.ko} Ko${f.initial ? ', initial' : ''}` })) });
  const lents = c.lighthouse.filter((l) => l.performance != null && l.performance < 90);
  if (lents.length) {
    const pire = Math.min(...lents.map((l) => l.performance));
    C.push({ id: 'PER-102', axe: 'performance', severity: pire < 50 ? 'P2' : 'P3', title: `${lents.length} écran(s) sous 90 en performance Lighthouse`, detail: `Note la plus basse : ${pire}/100.`, recommandation: 'Traiter d\'abord le LCP (image principale, police, rendu bloquant) puis le TBT (JavaScript initial).', count: lents.length, emplacements: lents.map((l) => ({ fichier: l.url, ligne: null, info: `perf ${l.performance}, LCP ${(l.lcp / 1000).toFixed(1)} s, CLS ${l.cls?.toFixed(2)}, TBT ${Math.round(l.tbt)} ms` })) });
  }
  return C;
}
