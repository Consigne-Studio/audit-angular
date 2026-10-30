// Estimation de la migration vers la dernière version, standalone, signals et sans zone.js.
// Ordres de grandeur en jours de développeur expérimenté, fourchette basse / haute.
// Les coefficients sont des hypothèses de terrain, documentées ici ; la revue humaine les ajuste.
import { DERNIERE_MAJEURE } from './regles.mjs';

const arrondi = (x) => Math.max(0.5, Math.round(x * 2) / 2);

export function estimer(p, ind, constats) {
  const a = (id) => constats.find((c) => c.id === id);
  const lots = [];
  const lot = (id, titre, bas, haut, base) => lots.push({ id, titre, bas: arrondi(bas), haut: arrondi(Math.max(haut, bas)), base });
  // Facteur de taille : 1 jusqu'à 20 000 lignes de TS, plafonné à 4.
  const taille = Math.min(4, Math.max(1, ind.lignesTs / 20_000));

  const maj = p.angular.major;
  if (maj != null && maj < DERNIERE_MAJEURE) {
    const n = DERNIERE_MAJEURE - maj;
    lot('montee', `Montée de version Angular ${maj} → ${DERNIERE_MAJEURE} (${n} étape(s) \`ng update\`)`, n * 0.5 * taille, n * 1 * taille, `${n} version(s) majeure(s) × 0,5 à 1 j × facteur de taille ${taille.toFixed(1)}`);
  }
  const bloquants = constats.filter((c) => c.id.startsWith('DEP-') && ['P1', 'P2'].includes(c.severity) && c.axe === 'versions');
  const desal = (a('VER-004')?.count ?? 0);
  if (bloquants.length || desal) lot('dependances', 'Dépendances bloquantes ou liées à Angular', bloquants.length * 1 + desal * 0.5, bloquants.length * 3 + desal * 2, `${bloquants.length} remplacement(s) × 1 à 3 j, ${desal} montée(s) de bibliothèque × 0,5 à 2 j`);
  if (a('VER-010')) lot('rxjs', 'RxJS 6 → 7', 0.5 * taille, 2 * taille, '0,5 à 2 j × facteur de taille');
  if (a('PER-001')) lot('builder', 'Passage au constructeur application (esbuild)', 0.5, 2, 'migration officielle + correctifs de configuration');
  if (ind.ngModules) lot('standalone', 'Composants standalone, suppression des NgModules', 0.25 + ind.ngModules * 0.05, 0.5 + ind.ngModules * 0.2, `migration officielle ; 0,05 à 0,2 j de reprise par module (${ind.ngModules})`);
  if (ind.controleFluxAncien) lot('controle-flux', 'Contrôle de flux @if / @for / @switch', 0.1 + ind.controleFluxAncien * 0.002, 0.25 + ind.controleFluxAncien * 0.01, `migration officielle ; 0,002 à 0,01 j de relecture par occurrence (${ind.controleFluxAncien})`);
  const io = (a('MIG-003')?.count ?? 0) + (a('MIG-004')?.count ?? 0);
  if (io) lot('signals-io', 'Entrées, sorties et requêtes en signals', io * 0.005, io * 0.03, `migrations officielles ; 0,005 à 0,03 j par décorateur (${io})`);
  if (a('MIG-005')) lot('inject', 'Injection avec inject()', 0.1, 0.25 + ind.injectionConstructeur * 0.005, `migration officielle (${ind.injectionConstructeur} paramètres)`);
  if (a('MIG-006')) {
    const nonOnPush = ind.composants - ind.onPush;
    const zoneFichiers = a('MIG-006').emplacements.length;
    lot('zoneless', 'Passage sans zone.js (OnPush, signals, recette)', 1 + nonOnPush * 0.03 + zoneFichiers * 0.1, 2 + nonOnPush * 0.08 + zoneFichiers * 0.3, `${nonOnPush} composant(s) à passer en OnPush × 0,03 à 0,08 j, ${zoneFichiers} usage(s) de NgZone × 0,1 à 0,3 j, + 1 à 2 j de recette`);
  }
  if (a('QUA-009')) lot('vitest', 'Tests unitaires Karma → Vitest', 0.5 + ind.fichiersTest * 0.005, 2 + ind.fichiersTest * 0.03, `${ind.fichiersTest} fichier(s) de test`);
  if (a('DEP-protractor')) lot('e2e', 'Tests de bout en bout Protractor → Playwright', 1 + p.e2eSpecs * 0.1, 3 + p.e2eSpecs * 0.4, `${p.e2eSpecs} fichier(s) e2e`);
  if (a('DEP-tslint') || a('QUA-004')) lot('lint', 'Passage à ESLint (angular-eslint)', 0.5, 1.5, 'schematic + correction des règles');
  if (a('QUA-001')) lot('strict', 'Mode strict TypeScript', 0.5 * taille + ind.any * 0.01, 1.2 * taille + ind.any * 0.03, `0,5 à 1,2 j × facteur de taille + 0,01 à 0,03 j par any (${ind.any})`);
  if (lots.length) lot('recette', 'Recette de non-régression et livraison', 1 + lots.length * 0.1, 1.5 + lots.length * 0.3, `forfait selon le nombre de lots (${lots.length})`);

  const total = { bas: lots.reduce((s, l) => s + l.bas, 0), haut: lots.reduce((s, l) => s + l.haut, 0) };
  return { lots, total, hypotheses: 'Développeur Angular expérimenté, migrations officielles utilisées, tests existants exécutables. Hors évolutions fonctionnelles et hors reprise de bibliothèques internes non analysées.' };
}
