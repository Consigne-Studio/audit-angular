// Rapport HTML autonome (polices intégrées), imprimable en A4. Charte « Consigne » : gris process,
// une seule couleur de signal (vert marche, gamme outillage développeur) portée par la bulle de couverture.
import { readFile } from 'node:fs/promises';
import { AXES } from '../index.mjs';
import { html as e, enLigne, versHtml } from './markdown.mjs';

const C = { process: '#D4D7DA', releve: '#F3F4F5', carter: '#9AA0A6', gris: '#5C636A', graphite: '#1B1E21', acier: '#2A2F34', signal: '#2BB673' };
const POLICES = new URL('../../polices/', import.meta.url);
const NOMS_SEV = { P1: 'À traiter d\'abord', P2: 'Important', P3: 'À planifier', P4: 'Information' };
const nf = (n) => String(n).replace('.', ',');
const jours = (n) => `${nf(n)} j`;

async function polices() {
  const b64 = async (n) => (await readFile(new URL(n, POLICES))).toString('base64');
  return `@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${await b64('Archivo-var.woff2')}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:'Martian Mono';src:url(data:font/woff2;base64,${await b64('MartianMono-var.woff2')}) format('woff2');font-weight:100 800;font-stretch:75% 112.5%}
@font-face{font-family:Atkinson;src:url(data:font/woff2;base64,${await b64('AtkinsonHyperlegibleNext-var.woff2')}) format('woff2');font-weight:200 800}`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html{background:${C.process}}
body{font:15px/1.5 Atkinson,system-ui,sans-serif;color:${C.graphite};-webkit-font-smoothing:antialiased;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.titre{font-family:Archivo,'Arial Narrow',sans-serif;font-weight:800;font-stretch:62%;text-transform:uppercase;line-height:.9;letter-spacing:-.005em}
.data,th{font-family:'Martian Mono',ui-monospace,monospace;font-stretch:87.5%;font-weight:500;text-transform:uppercase;letter-spacing:.06em;font-variant-numeric:tabular-nums}
code{font-family:'Martian Mono',ui-monospace,monospace;font-stretch:87.5%;font-size:.82em;background:${C.process};padding:0 .3em;word-break:break-word}
a{color:inherit}
.feuille{width:210mm;min-height:297mm;margin:24px auto;background:${C.releve};padding:18mm 16mm 20mm;position:relative;border:1.5px solid ${C.graphite}}
.planche{background-color:${C.process};background-image:linear-gradient(rgba(27,30,33,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(27,30,33,.075) 1px,transparent 1px);background-size:16px 16px}
.pied{position:absolute;left:16mm;right:16mm;bottom:8mm;display:flex;justify-content:space-between;font-size:8.5px;color:${C.gris};border-top:1px solid ${C.graphite};padding-top:4px}
h2{font-family:Archivo,sans-serif;font-weight:800;font-stretch:62%;text-transform:uppercase;font-size:34px;line-height:1.1;padding-top:3mm;margin:0 0 6mm;display:flex;gap:10px;align-items:baseline}
h2 .n{font-family:'Martian Mono',monospace;font-stretch:87.5%;font-size:11px;font-weight:600;border:1.5px solid ${C.graphite};padding:2px 6px;transform:translateY(-6px)}
h3{font-family:Archivo,sans-serif;font-weight:800;font-stretch:75%;text-transform:uppercase;font-size:19px;margin:7mm 0 3mm}
h4{font-size:15px;margin:4mm 0 2mm}
p{margin:0 0 3mm;max-width:165mm}
ul,ol{margin:0 0 3mm 5mm}
li{margin:0 0 1.5mm}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{font-size:8.5px;text-align:left;padding:5px 6px;border-bottom:1.5px solid ${C.graphite};vertical-align:bottom;color:${C.gris}}
td{padding:6px;border-bottom:1px solid rgba(27,30,33,.22);vertical-align:top}
td.num,th.num{text-align:right;font-family:'Martian Mono',monospace;font-stretch:87.5%;font-variant-numeric:tabular-nums;white-space:nowrap}
.sev{display:inline-block;width:26px;height:20px;line-height:17px;text-align:center;font:600 10px 'Martian Mono',monospace;font-stretch:87.5%;border:1px solid ${C.graphite}}
.sev.P1{background:${C.graphite};color:${C.releve}}
.sev.P2{border-width:2.5px;line-height:15px}
.sev.P4{border-style:dashed;color:${C.gris}}
.cadre{border:1.5px solid ${C.graphite};background:${C.releve}}
.grille2{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.kpi{display:grid;grid-template-columns:repeat(4,1fr);border-top:1.5px solid ${C.graphite};border-bottom:1.5px solid ${C.graphite}}
.kpi>div{padding:8px 0 8px 10px}
.kpi>div+div{border-left:1px solid ${C.graphite}}
.kpi .v{font-size:40px}
.kpi .k{font-size:8.5px;margin-top:5px;color:${C.gris}}
.barre{display:grid;grid-template-columns:52mm 1fr 14mm;align-items:center;gap:4mm;padding:3mm 0;border-bottom:1px solid rgba(27,30,33,.22)}
.barre .lib{font-size:13.5px;font-weight:600}
.barre .val{text-align:right;font-family:Archivo,sans-serif;font-weight:800;font-stretch:62%;font-size:26px}
.constat{border-top:1px solid ${C.graphite};padding:3.5mm 0 3mm;break-inside:avoid}
.constat .tete{display:grid;grid-template-columns:30px 1fr auto;gap:8px;align-items:start}
.constat .id{font-size:9px;color:${C.gris}}
.constat .t{font-weight:700;font-size:14.5px;line-height:1.3}
.constat .d{margin:1.5mm 0 0 38px;font-size:13px}
.constat .r{margin:1.5mm 0 0 38px;font-size:13px}
.constat .r b{font-family:'Martian Mono',monospace;font-stretch:87.5%;font-size:9px;letter-spacing:.06em;text-transform:uppercase;margin-right:4px}
.constat .x{margin:2mm 0 0 38px;padding:2mm 3mm;border-left:3px solid ${C.graphite};background:${C.process};font-size:13px}
.constat details{margin:1.5mm 0 0 38px;font-size:11px}
.constat summary{cursor:pointer;font-family:'Martian Mono',monospace;font-stretch:87.5%;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${C.gris}}
.constat details ul{list-style:none;margin:1mm 0 0;columns:2;column-gap:6mm}
.constat details li{font-family:'Martian Mono',monospace;font-stretch:87.5%;font-size:9.5px;margin:0 0 .6mm;word-break:break-all}
.legende{display:flex;gap:5mm;flex-wrap:wrap;font-size:11.5px;margin:0 0 4mm}
.legende span{display:flex;gap:6px;align-items:center}
.note{font-size:11.5px;color:${C.gris}}
.saut{break-before:page}
@page{size:A4;margin:16mm 15mm 18mm;
  @bottom-left{content:__PIED__;font:500 7.5px 'Martian Mono',monospace;color:${C.gris};text-transform:uppercase;letter-spacing:.06em}
  @bottom-right{content:'Folio ' counter(page);font:500 7.5px 'Martian Mono',monospace;color:${C.gris};text-transform:uppercase;letter-spacing:.06em}}
@page:first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}
@media print{html,body{background:#fff}.feuille{width:auto;margin:0;border:0;min-height:0;padding:0;break-before:page;background:none}.feuille.couverture{background-color:${C.process};width:210mm;height:296.5mm;overflow:hidden;padding:18mm 16mm 16mm;break-before:auto}.pied{display:none}.constat details ul{display:block}h3{break-after:avoid}tr{break-inside:avoid}}
@media screen and (max-width:820px){.feuille{width:auto;min-height:0;margin:0;padding:16px 16px 48px;border-width:0 0 1.5px}.grille2{grid-template-columns:1fr}.barre{grid-template-columns:1fr 46px}.barre svg{grid-column:1/-1;grid-row:2}.kpi{grid-template-columns:1fr 1fr}.kpi>div:nth-child(3){border-left:0}.couv-titre{font-size:76px!important}.constat details ul{columns:1}}
`;

function bulle(d = 120) {
  const sw = Math.max(2, d / 40), r = d / 2 - sw / 2;
  return `<svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" role="img" aria-label="Repère DEV-602"><circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="${C.signal}" stroke="${C.graphite}" stroke-width="${sw}"/>
  <line x1="${sw / 2}" y1="${d / 2}" x2="${d - sw / 2}" y2="${d / 2}" stroke="${C.graphite}" stroke-width="${sw}"/>
  <text x="${d / 2}" y="${d * 0.4}" text-anchor="middle" font-family="Archivo" font-stretch="62%" font-weight="800" font-size="${d * 0.3}" fill="${C.graphite}">DEV</text>
  <text x="${d / 2}" y="${d * 0.76}" text-anchor="middle" font-family="Martian Mono" font-stretch="87.5%" font-weight="500" font-size="${d * 0.2}" fill="${C.graphite}">602</text></svg>`;
}

// Barre analogique (symbole de la maison) : piste 0–100, plage normale 70–100 foncée, curseur à la valeur.
function barre(valeur, { w = 300, h = 26, normal = 70 } = {}) {
  const x = (v) => (v / 100) * w;
  const v = valeur ?? 0;
  const ty = h * 0.45;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="${valeur ?? 'non mesuré'} sur 100">
  <rect x="0" y="${ty}" width="${w}" height="${h - ty}" fill="${C.carter}"/>
  <rect x="${x(normal)}" y="${ty}" width="${w - x(normal)}" height="${h - ty}" fill="${C.gris}"/>
  ${valeur == null ? '' : `<rect x="0" y="${ty + (h - ty) * 0.3}" width="${x(v)}" height="${(h - ty) * 0.4}" fill="${C.graphite}"/>
  <path d="M${Math.max(7, Math.min(w - 7, x(v))) - 7} 0 h14 l-7 ${ty - 1} z" fill="${C.graphite}"/>`}</svg>`;
}

const cartouche = (rows, w = '86mm') => `<div class="cadre" style="width:${w}">${rows.map((r, j) => `<div style="display:grid;grid-template-columns:${r.map((c) => `${c.f ?? 1}fr`).join(' ')};${j ? `border-top:1px solid ${C.graphite}` : ''}">${r.map((c, i) => `<div style="padding:4px 7px 6px;${i ? `border-left:1px solid ${C.graphite};` : ''}min-width:0"><div class="data" style="font-size:7.5px;color:${C.gris}">${e(c.k)}</div><div class="${c.titre ? 'titre' : 'data'}" style="font-size:${c.titre ? 20 : 10.5}px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(c.v)}</div></div>`).join('')}</div>`).join('')}</div>`;

const sev = (s) => `<span class="sev ${s}" title="${NOMS_SEV[s]}">${s}</span>`;
const pied = (a, folio) => `<div class="pied data"><span>Audit Angular · ${e(a.projet.nom ?? 'projet')} · ${e(a.date)}</span><span>DEV-602 · audit-angular ${e(a.outil.version)}</span><span>Folio ${folio}</span></div>`;

/**
 * @param {object} a audit (audit.json)
 * @param {object} [revue] revue de l'expert (lireRevue)
 */
export async function rapportHtml(a, revue = {}) {
  const f = a.findings;
  const parSev = (s) => f.filter((x) => x.severity === s).length;
  const support = f.find((x) => x.id === 'VER-001' || x.id === 'VER-002');
  const ind = a.indicateurs;
  const client = revue.client ?? a.projet.nom ?? 'Projet audité';
  let folio = 0;
  const F = () => String(++folio).padStart(2, '0');
  const pages = [];

  // 1. Couverture
  pages.push(`<section class="feuille planche couverture" style="display:flex;flex-direction:column">
    <div style="display:flex;gap:6mm;align-items:center">${bulle(104)}<div class="data" style="font-size:10px;line-height:1.8;color:${C.gris}">Rapport d'audit<br>Application Angular</div></div>
    <div class="titre couv-titre" style="font-size:118px;margin:14mm 0 6mm">Audit<br>Angular</div>
    <p style="font-size:21px;line-height:1.35;max-width:150mm;font-weight:500">${e(client)} : versions, préparation aux signals et à Angular ${22}, qualité, sécurité et performance, avec une estimation de la migration en jours.</p>
    <div class="kpi" style="margin-top:10mm;max-width:178mm">
      <div><div class="titre v">${a.scores.global}<span style="font-size:20px">/100</span></div><div class="data k">Indice global</div></div>
      <div><div class="titre v">${e(a.angular.version ?? '—')}</div><div class="data k">Angular installé</div></div>
      <div><div class="titre v">${parSev('P1')}</div><div class="data k">Constats P1</div></div>
      <div><div class="titre v">${nf(a.estimation.total.bas)}–${nf(a.estimation.total.haut)}</div><div class="data k">Jours de migration</div></div>
    </div>
    <div style="flex:1"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6mm;flex-wrap:wrap">
      <div class="note" style="max-width:80mm">Analyse statique en lecture seule : aucun code n'a été exécuté ni transmis. Chiffres calculés par audit-angular ${e(a.outil.version)} le ${e(a.date)}${revue.synthese ? ', relus et commentés par l\'auditeur' : ''}.</div>
      ${cartouche([[{ k: 'Désignation', v: 'Audit Angular', titre: true, f: 2.2 }, { k: 'Repère', v: 'DEV-602' }], [{ k: 'Projet', v: client, f: 2.2 }, { k: 'Date', v: a.date }], [{ k: 'Studio', v: 'Consigne', f: 1.4 }, { k: 'Fichiers', v: String(a.projet.fichiers) }, { k: 'Folio', v: F() }]])}
    </div>
  </section>`);

  // 2. Synthèse
  const top = f.filter((x) => x.severity === 'P1' || x.severity === 'P2').slice(0, 6);
  pages.push(`<section class="feuille">
    <h2><span class="n">1</span>Synthèse</h2>
    ${revue.synthese ? `<div style="font-size:16px">${versHtml(revue.synthese)}</div>` : `<p>${support ? enLigne(support.title) + '. ' : ''}${f.length} constats, dont ${parSev('P1')} à traiter d'abord (P1) et ${parSev('P2')} importants (P2). La migration vers Angular 22 sans zone.js est estimée entre <strong>${jours(a.estimation.total.bas)} et ${jours(a.estimation.total.haut)}</strong> de développement.</p>`}
    <h3>Indices par axe</h3>
    <p class="note">0 à 100 ; chaque constat retire des points selon sa priorité (P1 −25, P2 −12, P3 −5, P4 −2). Zone foncée : plage visée (70 et plus).</p>
    ${Object.entries(AXES).map(([k, lib]) => `<div class="barre"><span class="lib">${e(lib)}</span>${barre(a.scores[k])}<span class="val">${a.scores[k]}</span></div>`).join('')}
    <div class="barre" style="border-bottom:1.5px solid ${C.graphite}"><span class="lib">Indice global <span class="note">(versions et sécurité comptent double)</span></span>${barre(a.scores.global)}<span class="val">${a.scores.global}</span></div>
    <h3>Priorités</h3>
    <table><thead><tr><th style="width:34px">Prio.</th><th>Constat</th><th style="width:22mm">Axe</th></tr></thead><tbody>
    ${top.map((x) => `<tr><td>${sev(x.severity)}</td><td><strong>${enLigne(x.title)}</strong><div class="note">${enLigne(x.recommandation)}</div></td><td class="data" style="font-size:9px">${e(AXES[x.axe])}</td></tr>`).join('')}
    </tbody></table>
    ${pied(a, F())}
  </section>`);

  // 3. Préparation (indicateurs)
  const prep = [
    ['Composants standalone', ind.pctStandalone, `${ind.standalone} / ${ind.composants}`],
    ['Composants OnPush', ind.pctOnPush, `${ind.onPush} / ${ind.composants}`],
    ['Contrôle de flux @if / @for', ind.pctControleFluxNouveau, `${ind.controleFluxNouveau} / ${ind.controleFluxNouveau + ind.controleFluxAncien}`],
    ['Entrées / sorties en signals', ind.pctEntreesSortiesSignals, `${ind.entreesSortiesSignals} / ${ind.entreesSortiesSignals + (f.find((x) => x.id === 'MIG-003')?.count ?? 0)}`],
    ['Injection par inject()', ind.pctInject, `${ind.injectFonction} / ${ind.injectFonction + ind.injectionConstructeur}`],
    ['Routes chargées à la demande', ind.pctRoutesDifferees, `${ind.routesDifferees} / ${ind.routesDifferees + ind.routesDirectes}`],
    ['Fichiers de composants testés', ind.pctComposantsTestes, ''],
  ];
  pages.push(`<section class="feuille">
    <h2><span class="n">2</span>Préparation à Angular 22</h2>
    <p>Part de l'application déjà écrite dans le style actuel d'Angular (standalone, signals, sans zone.js). Plus ces barres sont pleines, plus la migration est courte.</p>
    ${prep.map(([lib, v, d]) => `<div class="barre"><span class="lib">${e(lib)}<br><span class="note data" style="font-size:9px">${e(d)}</span></span>${barre(v, { normal: 80 })}<span class="val">${v ?? '—'}<span style="font-size:13px">${v == null ? '' : ' %'}</span></span></div>`).join('')}
    <h3>Mesures</h3>
    <div class="grille2"><table><tbody>
      <tr><td>Fichiers TypeScript (hors tests)</td><td class="num">${ind.fichiersTs}</td></tr>
      <tr><td>Lignes de TypeScript</td><td class="num">${ind.lignesTs.toLocaleString('fr-FR')}</td></tr>
      <tr><td>Composants</td><td class="num">${ind.composants}</td></tr>
      <tr><td>NgModules</td><td class="num">${ind.ngModules}</td></tr>
      <tr><td>Gabarits analysés</td><td class="num">${ind.gabarits}</td></tr>
      <tr><td>Fichiers de test</td><td class="num">${ind.fichiersTest}</td></tr>
    </tbody></table><table><tbody>
      <tr><td>signal / computed / resource</td><td class="num">${ind.signalsEtat}</td></tr>
      <tr><td>Blocs @defer</td><td class="num">${ind.defer}</td></tr>
      <tr><td>Appels subscribe()</td><td class="num">${ind.subscribe}</td></tr>
      <tr><td>Nettoyages d'abonnement</td><td class="num">${ind.nettoyageAbonnements}</td></tr>
      <tr><td>Types any</td><td class="num">${ind.any}</td></tr>
      <tr><td>Sans zone.js</td><td class="num">${ind.zoneless ? 'oui' : 'non'}</td></tr>
    </tbody></table></div>
    ${pied(a, F())}
  </section>`);

  // 3 bis. Mesures dynamiques (formules Standard et Migration)
  const m = a.mesures;
  if (m && (m.npmAudit || m.stats || m.lighthouse?.length)) {
    const na = m.npmAudit;
    const lh = m.lighthouse ?? [];
    const st = m.stats;
    const sec = (ms) => (ms == null ? '—' : `${nf((ms / 1000).toFixed(1))} s`);
    pages.push(`<section class="feuille">
    <h2><span class="n">2b</span>Mesures sur l'application</h2>
    <p>Résultats des commandes lancées par votre équipe sur le projet installé et construit (fichiers JSON fournis avec audit.json).</p>
    ${na ? `<h3>Vulnérabilités connues des dépendances</h3>
    <div class="kpi" style="margin-bottom:4mm">${[['critical', 'Critiques'], ['high', 'Hautes'], ['moderate', 'Modérées'], ['low', 'Faibles']].map(([k, l]) => `<div><div class="titre v">${na.totaux[k] ?? 0}</div><div class="data k">${l}</div></div>`).join('')}</div>
    <table><thead><tr><th>Paquet</th><th>Gravité</th><th>Dépendance</th><th>Correctif</th></tr></thead><tbody>
    ${na.paquets.slice(0, 15).map((p) => `<tr><td><code>${e(p.nom)}</code></td><td class="data" style="font-size:9.5px">${e(p.severite)}</td><td>${p.direct ? 'directe' : 'indirecte'}</td><td>${e(p.correctif)}</td></tr>`).join('')}
    </tbody></table>${na.paquets.length > 15 ? `<p class="note" style="margin-top:2mm">${na.paquets.length - 15} autre(s) paquet(s) concerné(s), liste complète dans audit.json.</p>` : ''}` : ''}
    ${st ? `<h3>Poids des bundles</h3>
    <div class="kpi" style="margin-bottom:4mm"><div><div class="titre v">${st.jsInitialKo}</div><div class="data k">Ko JS initial</div></div><div><div class="titre v">${st.jsKo}</div><div class="data k">Ko JS total</div></div><div><div class="titre v">${st.cssKo}</div><div class="data k">Ko CSS</div></div><div><div class="titre v">${st.morceaux}</div><div class="data k">Fichiers JS</div></div></div>
    <table><thead><tr><th>Fichier</th><th class="num">Ko</th><th>Chargement</th></tr></thead><tbody>${st.plusGros.map((f) => `<tr><td><code>${e(f.fichier)}</code></td><td class="num">${f.ko}</td><td>${f.initial ? 'initial' : 'à la demande'}</td></tr>`).join('')}</tbody></table>
    <p class="note" style="margin-top:2mm">Tailles avant compression, lues dans les statistiques du build de production.</p>` : ''}
    ${lh.length ? `<h3>Lighthouse</h3>
    <table><thead><tr><th>Écran</th><th class="num">Perf.</th><th class="num">Access.</th><th class="num">LCP</th><th class="num">CLS</th><th class="num">TBT</th></tr></thead><tbody>
    ${lh.map((l) => `<tr><td style="word-break:break-all">${e(l.url)}</td><td class="num">${l.performance ?? '—'}</td><td class="num">${l.accessibilite ?? '—'}</td><td class="num">${sec(l.lcp)}</td><td class="num">${l.cls == null ? '—' : nf(l.cls.toFixed(2))}</td><td class="num">${l.tbt == null ? '—' : Math.round(l.tbt) + ' ms'}</td></tr>`).join('')}
    </tbody></table><p class="note" style="margin-top:2mm">Seuils « bons » de Google : LCP ≤ 2,5 s, CLS ≤ 0,1. Le TBT de laboratoire approche l'INP mesuré chez les utilisateurs.</p>` : ''}
    ${pied(a, F())}
  </section>`);
  }

  // 4. Constats par axe
  const blocConstat = (x) => `<div class="constat"><div class="tete">${sev(x.severity)}<div><div class="t">${enLigne(x.title)}</div></div><span class="id data">${e(x.id)}</span></div>
    <div class="d">${enLigne(x.detail)}</div>
    <div class="r"><b>Action</b>${enLigne(x.recommandation)}</div>
    ${revue.remarques?.[x.id] ? `<div class="x"><span class="data" style="font-size:9px">Avis de l'auditeur</span><br>${enLigne(revue.remarques[x.id])}</div>` : ''}
    ${x.emplacements?.length ? `<details${x.emplacements.length <= 6 ? ' open' : ''}><summary>${x.emplacements.length < x.count && x.count > 25 ? `${x.emplacements.length} premiers emplacements sur ${x.count}` : `${x.emplacements.length} emplacement(s)`}</summary><ul>${x.emplacements.map((p) => `<li>${e(p.fichier)}${p.ligne ? `:${p.ligne}` : ''}${p.info ? ` · ${e(p.info)}` : ''}</li>`).join('')}</ul></details>` : ''}
  </div>`;
  let n = 3;
  const axesPresents = Object.keys(AXES).filter((k) => f.some((x) => x.axe === k));
  pages.push(`<section class="feuille">
    <h2><span class="n">3</span>Constats</h2>
    <div class="legende">${['P1', 'P2', 'P3', 'P4'].map((s) => `<span>${sev(s)} ${NOMS_SEV[s]} (${parSev(s)})</span>`).join('')}</div>
    <p class="note">Priorités inspirées de la gestion d'alarmes : P1 bloque ou expose, P4 informe. Les emplacements sont relatifs à la racine du dépôt.</p>
    ${axesPresents.map((k) => `<h3>3.${axesPresents.indexOf(k) + 1} ${e(AXES[k])} · indice ${a.scores[k]}</h3>${f.filter((x) => x.axe === k).map(blocConstat).join('')}`).join('')}
    ${pied(a, F())}
  </section>`);

  // 5. Estimation
  pages.push(`<section class="feuille">
    <h2><span class="n">${++n}</span>Estimation de la migration</h2>
    <p>Objectif : Angular 22, composants standalone, signals, sans zone.js, outillage à jour. Fourchettes en jours de développeur Angular expérimenté.</p>
    <table><thead><tr><th>Lot</th><th>Base de calcul</th><th class="num">Bas</th><th class="num">Haut</th></tr></thead><tbody>
    ${a.estimation.lots.map((l) => `<tr><td><strong>${enLigne(l.titre)}</strong></td><td class="note">${enLigne(l.base)}</td><td class="num">${nf(l.bas)}</td><td class="num">${nf(l.haut)}</td></tr>`).join('')}
    <tr><td colspan="2" style="border-bottom:1.5px solid ${C.graphite}"><strong class="titre" style="font-size:20px">Total</strong></td><td class="num" style="border-bottom:1.5px solid ${C.graphite};font-weight:700">${nf(a.estimation.total.bas)}</td><td class="num" style="border-bottom:1.5px solid ${C.graphite};font-weight:700">${nf(a.estimation.total.haut)}</td></tr>
    </tbody></table>
    <p class="note" style="margin-top:3mm">Hypothèses : ${e(a.estimation.hypotheses)}</p>
    ${revue.estimation ? `<h3>Ajustement de l'auditeur</h3>${versHtml(revue.estimation)}` : ''}
    ${revue.plan ? `<h3>Plan d'action recommandé</h3>${versHtml(revue.plan)}` : ''}
    ${pied(a, F())}
  </section>`);

  // 6. Annexes
  const deps = a.dependencies.filter((d) => !d.dev);
  pages.push(`<section class="feuille">
    <h2><span class="n">${++n}</span>Annexes</h2>
    <h3>Configuration relevée</h3>
    <table><tbody>
      <tr><td>Constructeur (build)</td><td><code>${e(a.configuration.builder ?? '—')}</code></td></tr>
      <tr><td>Lanceur de tests</td><td><code>${e(a.configuration.testBuilder ?? '—')}</code></td></tr>
      <tr><td>TypeScript strict / gabarits stricts</td><td>${a.configuration.tsconfig.strict ? 'oui' : 'non'} / ${a.configuration.tsconfig.strictTemplates ? 'oui' : 'non'}</td></tr>
      <tr><td>Versions : TypeScript, RxJS, zone.js</td><td>${e(a.versions.typescript ?? '—')}, ${e(a.versions.rxjs ?? '—')}, ${e(a.versions.zonejs ?? 'absent')}</td></tr>
      <tr><td>Source des versions</td><td>${e(a.sourceVersions ?? 'plages de package.json (pas de fichier de verrouillage)')}</td></tr>
      <tr><td>Intégration continue</td><td>${e(a.configuration.outillage.ci.join(', ') || 'aucune détectée')}</td></tr>
    </tbody></table>
    <h3>Dépendances d'exécution (${deps.length})</h3>
    <table style="font-size:11px"><thead><tr><th>Paquet</th><th class="num">Version</th><th>Paquet</th><th class="num">Version</th></tr></thead><tbody>
    ${Array.from({ length: Math.ceil(deps.length / 2) }, (_, i) => [deps[i * 2], deps[i * 2 + 1]]).map(([g, d]) => `<tr><td><code>${e(g.name)}</code></td><td class="num">${e(g.version ?? '—')}</td><td>${d ? `<code>${e(d.name)}</code>` : ''}</td><td class="num">${d ? e(d.version ?? '—') : ''}</td></tr>`).join('')}
    </tbody></table>
    <h3>Méthode et limites</h3>
    <ul class="note" style="font-size:12px">
      <li>Lecture seule : l'outil parcourt les sources (TypeScript avec le compilateur officiel, gabarits HTML, angular.json, tsconfig, fichiers de verrouillage). Rien n'est installé, compilé ni exécuté.</li>
      <li>Les dossiers node_modules, dist, .angular et coverage sont ignorés. Les bibliothèques internes publiées ailleurs ne sont pas analysées.</li>
      ${a.mesures ? '<li>Mesures dynamiques : sorties de npm audit, du build de production et de Lighthouse fournies par l\'équipe du projet, telles quelles.</li>' : '<li>Les vulnérabilités connues des dépendances (npm audit), le poids réel des bundles et les mesures Lighthouse demandent d\'installer et de construire le projet : ils font partie des formules Standard et Migration.</li>'}<li>La couverture de tests réelle n'est pas mesurée : l'outil indique seulement quels composants ont un fichier de test.</li>
      <li>Les estimations sont des ordres de grandeur fondés sur des coefficients publiés dans le code de l'outil (src/estimation.mjs) ; l'auditeur les ajuste dans la revue.</li>
      <li>Calendrier de support : angular.dev/reference/releases, relevé à la date de l'outil.</li>
    </ul>
    ${pied(a, F())}
  </section>`);

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Audit Angular · ${e(client)}</title><style>${await polices()}${CSS.replace('__PIED__', JSON.stringify(`Audit Angular · ${client} · ${a.date} · DEV-602`).replace(/</g, '\\3C '))}</style></head><body>${pages.join('\n')}</body></html>`;
}
