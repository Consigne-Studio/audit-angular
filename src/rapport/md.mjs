// Rapport Markdown (pour un ticket, un wiki ou une revue de code).
import { AXES } from '../index.mjs';

const nf = (n) => String(n).replace('.', ',');
const cel = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function rapportMd(a, revue = {}) {
  const L = [];
  const client = revue.client ?? a.projet.nom ?? 'Projet audité';
  L.push(`# Audit Angular · ${client}`, '');
  L.push(`Date : ${a.date} · Angular ${a.angular.version ?? 'non trouvé'} · audit-angular ${a.outil.version} · indice global **${a.scores.global}/100** · migration estimée **${nf(a.estimation.total.bas)} à ${nf(a.estimation.total.haut)} j**`, '');
  if (revue.synthese) L.push('## Synthèse', '', revue.synthese, '');
  L.push('## Indices par axe', '', '| Axe | Indice |', '|---|---:|');
  for (const [k, lib] of Object.entries(AXES)) L.push(`| ${lib} | ${a.scores[k]} |`);
  L.push(`| **Global** | **${a.scores.global}** |`, '');
  L.push('## Constats', '', '| Prio. | Id | Constat | Action |', '|---|---|---|---|');
  for (const f of a.findings) L.push(`| ${f.severity} | ${f.id} | ${cel(f.title)} | ${cel(f.recommandation)} |`);
  L.push('');
  for (const f of a.findings.filter((x) => x.emplacements?.length)) {
    L.push(`### ${f.id} · ${f.title}`, '', f.detail, '');
    if (revue.remarques?.[f.id]) L.push(`> Avis de l'auditeur : ${revue.remarques[f.id]}`, '');
    for (const p of f.emplacements) L.push(`- \`${p.fichier}${p.ligne ? `:${p.ligne}` : ''}\`${p.info ? ` ${p.info}` : ''}`);
    if (f.count > f.emplacements.length) L.push(`- … ${f.count - f.emplacements.length} de plus`);
    L.push('');
  }
  const m = a.mesures;
  if (m?.npmAudit) L.push('## Vulnérabilités (npm audit)', '', Object.entries(m.npmAudit.totaux).filter(([k]) => k !== 'total').map(([k, v]) => `${k} : ${v}`).join(' · '), '');
  if (m?.stats) L.push('## Poids des bundles', '', `JS initial ${m.stats.jsInitialKo} Ko · JS total ${m.stats.jsKo} Ko · CSS ${m.stats.cssKo} Ko`, '');
  if (m?.lighthouse?.length) { L.push('## Lighthouse', '', '| Écran | Perf. | LCP (ms) | CLS | TBT (ms) |', '|---|---:|---:|---:|---:|'); for (const l of m.lighthouse) L.push(`| ${l.url} | ${l.performance} | ${Math.round(l.lcp)} | ${l.cls} | ${Math.round(l.tbt)} |`); L.push(''); }
  L.push('## Estimation de la migration', '', '| Lot | Base de calcul | Bas (j) | Haut (j) |', '|---|---|---:|---:|');
  for (const l of a.estimation.lots) L.push(`| ${cel(l.titre)} | ${cel(l.base)} | ${nf(l.bas)} | ${nf(l.haut)} |`);
  L.push(`| **Total** | | **${nf(a.estimation.total.bas)}** | **${nf(a.estimation.total.haut)}** |`, '', `Hypothèses : ${a.estimation.hypotheses}`, '');
  if (revue.estimation) L.push("## Ajustement de l'auditeur", '', revue.estimation, '');
  if (revue.plan) L.push("## Plan d'action recommandé", '', revue.plan, '');
  return L.join('\n');
}
