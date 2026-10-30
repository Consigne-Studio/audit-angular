// Règles d'audit : transforment les faits (projet, fichiers TS, gabarits) en constats priorisés.
// Priorités au sens des alarmes ISA-18.2 : P1 à traiter d'abord … P4 pour information.
import { majeure } from './projet.mjs';

// Calendrier officiel (https://angular.dev/reference/releases, relevé le 2026-10-23).
// fin = fin du support LTS (correctifs de sécurité). À mettre à jour à chaque version majeure.
export const SUPPORT = {
  22: { sortie: '2026-06-03', finActive: '2027-06-01', fin: '2028-06-01' },
  21: { sortie: '2025-11-19', finActive: '2026-06-03', fin: '2027-06-01' },
  20: { sortie: '2025-05-28', finActive: '2025-11-19', fin: '2026-11-28' },
  19: { sortie: '2024-11-19', fin: '2026-05-19' },
  18: { sortie: '2024-05-22', fin: '2025-11-21' },
  17: { sortie: '2023-11-08', fin: '2025-05-15' },
};
export const DERNIERE_MAJEURE = 22;

// Dépendances connues pour bloquer ou alourdir une montée de version.
const DEPENDANCES_A_RISQUE = [
  { nom: 'tslint', sev: 'P2', axe: 'qualite', titre: 'TSLint est abandonné depuis 2019', reco: 'Passer à ESLint avec angular-eslint (`ng add @angular-eslint/schematics`).' },
  { nom: 'codelyzer', sev: 'P3', axe: 'qualite', titre: 'Codelyzer (règles TSLint) est abandonné', reco: 'Supprimer avec TSLint, règles équivalentes dans angular-eslint.' },
  { nom: 'protractor', sev: 'P2', axe: 'qualite', titre: 'Protractor est arrêté depuis 2023', reco: 'Réécrire les tests de bout en bout avec Playwright ou Cypress.' },
  { nom: '@angular/flex-layout', sev: 'P1', axe: 'versions', titre: '@angular/flex-layout n\'est plus publié depuis la v15', reco: 'Remplacer par du CSS Grid / Flexbox natif ou des classes utilitaires.' },
  { nom: '@angular/http', sev: 'P1', axe: 'versions', titre: '@angular/http a été supprimé en v8', reco: 'Migrer vers HttpClient (@angular/common/http).' },
  { nom: 'rxjs-compat', sev: 'P2', axe: 'versions', titre: 'rxjs-compat maintient l\'API de RxJS 5', reco: 'Réécrire les imports et opérateurs, puis supprimer rxjs-compat.' },
  { nom: 'node-sass', sev: 'P2', axe: 'versions', titre: 'node-sass est abandonné', reco: 'Utiliser sass (Dart Sass), déjà inclus dans le CLI Angular.' },
  { nom: 'moment', sev: 'P3', axe: 'performance', titre: 'moment.js est en maintenance seule et alourdit le bundle (≈ 70 Ko gzip avec les locales)', reco: 'Passer à date-fns, Luxon ou à l\'API Intl / Temporal.' },
  { nom: 'jquery', sev: 'P3', axe: 'performance', titre: 'jQuery dans une application Angular', reco: 'Remplacer les manipulations DOM par des liaisons Angular ou Renderer2.' },
  { nom: '@nguniversal/express-engine', sev: 'P2', axe: 'versions', titre: 'Angular Universal est remplacé par @angular/ssr depuis la v17', reco: 'Migrer vers @angular/ssr.' },
  { nom: 'ng2-charts', sev: 'P4', axe: 'versions', titre: 'Bibliothèque de graphiques liée aux versions d\'Angular', reco: 'Vérifier la version compatible avant la montée.' },
  { nom: 'angular2-chartjs', sev: 'P2', axe: 'versions', titre: 'angular2-chartjs n\'est plus maintenu', reco: 'Remplacer par ng2-charts ou une intégration directe de Chart.js.' },
  { nom: 'ngx-echarts', sev: 'P4', axe: 'versions', titre: 'Bibliothèque de graphiques liée aux versions d\'Angular', reco: 'Vérifier la version compatible avant la montée.' },
];
// Bibliothèques dont la version majeure doit suivre celle d'Angular.
const ALIGNEES = ['@angular/material', '@angular/cdk', '@ngrx/store', '@ngrx/effects', '@ngrx/signals', 'primeng', '@angular-eslint/builder'];

const MAX_EMPLACEMENTS = 25;
const emp = (liste) => ({ emplacements: liste.slice(0, MAX_EMPLACEMENTS), _n: liste.length });
const ratio = (a, b) => (b ? Math.round((a / b) * 100) : null);

/**
 * @param {object} p faits projet
 * @param {object[]} ts faits par fichier TS (hors tests)
 * @param {object[]} specs faits des fichiers de test
 * @param {object[]} gab faits des gabarits
 * @param {{date: string}} opts
 */
export function evaluer(p, ts, specs, gab, { date }) {
  const C = [];
  const add = ({ _n, ...c }) => C.push({ emplacements: [], ...c, count: c.count ?? _n ?? 1 });
  const maj = p.angular.major;

  // ---------- Indicateurs ----------
  const composants = ts.flatMap((f) => f.composants.map((c) => ({ ...c, fichier: f.fichier })));
  const nbComp = composants.length;
  const standaloneDefaut = maj != null && maj >= 19;
  const estStandalone = (c) => (c.standalone === null ? standaloneDefaut : c.standalone);
  const somme = (fn) => ts.reduce((s, f) => s + fn(f), 0);
  const sommeG = (fn) => gab.reduce((s, g) => s + fn(g), 0);
  const decoAnciens = somme((f) => Object.values(f.decorateursAnciens).reduce((a, b) => a + b, 0));
  const decoIO = somme((f) => f.decorateursAnciens.Input + f.decorateursAnciens.Output);
  const decoQueries = somme((f) => f.decorateursAnciens.ViewChild + f.decorateursAnciens.ViewChildren + f.decorateursAnciens.ContentChild + f.decorateursAnciens.ContentChildren);
  const sigIO = somme((f) => f.apiSignals.input + f.apiSignals.output + f.apiSignals.model);
  const sigQueries = somme((f) => f.apiSignals.viewChild + f.apiSignals.viewChildren + f.apiSignals.contentChild + f.apiSignals.contentChildren);
  const sigEtat = somme((f) => f.apiSignals.signal + f.apiSignals.computed + f.apiSignals.linkedSignal + f.apiSignals.toSignal + f.apiSignals.resource + f.apiSignals.httpResource + f.apiSignals.rxResource);
  const ancienCF = sommeG((g) => g.ancienControle.ngIf + g.ancienControle.ngFor + g.ancienControle.ngSwitch);
  const nouveauCF = sommeG((g) => g.nouveauControle.if + g.nouveauControle.for + g.nouveauControle.switch);
  const modules = ts.flatMap((f) => f.ngModules.map((m) => ({ ...m, fichier: f.fichier })));
  const ctorInj = somme((f) => f.injectionsConstructeur);
  const injectN = somme((f) => f.injectCalls);
  const zoneless = ts.some((f) => f.zoneless);
  const routesDiff = somme((f) => f.routes.differees);
  const routesDir = somme((f) => f.routes.directes);
  const lignesTs = somme((f) => f.lignes);
  const nonOnPush = composants.filter((c) => !c.onPush);

  const indicateurs = {
    fichiersTs: ts.length,
    lignesTs,
    fichiersTest: specs.length,
    gabarits: gab.length,
    composants: nbComp,
    standalone: composants.filter(estStandalone).length,
    pctStandalone: ratio(composants.filter(estStandalone).length, nbComp),
    onPush: nbComp - nonOnPush.length,
    pctOnPush: ratio(nbComp - nonOnPush.length, nbComp),
    ngModules: modules.length,
    decorateursAnciens: decoAnciens,
    entreesSortiesSignals: sigIO,
    pctEntreesSortiesSignals: ratio(sigIO, sigIO + decoIO),
    requetesSignals: sigQueries,
    signalsEtat: sigEtat,
    controleFluxNouveau: nouveauCF,
    controleFluxAncien: ancienCF,
    pctControleFluxNouveau: ratio(nouveauCF, nouveauCF + ancienCF),
    injectionConstructeur: ctorInj,
    injectFonction: injectN,
    pctInject: ratio(injectN, injectN + ctorInj),
    zoneless,
    subscribe: somme((f) => f.subscribe),
    nettoyageAbonnements: somme((f) => f.nettoyageAbonnements),
    any: somme((f) => f.any.length),
    routesDifferees: routesDiff,
    routesDirectes: routesDir,
    pctRoutesDifferees: ratio(routesDiff, routesDiff + routesDir),
    defer: sommeG((g) => g.nouveauControle.defer),
  };

  // ---------- Axe versions ----------
  if (maj == null) {
    add({ id: 'VER-000', axe: 'versions', severity: 'P1', title: '@angular/core introuvable dans package.json', detail: 'Le dossier audité ne semble pas être une application Angular.', reco: 'Lancer l\'audit à la racine du dépôt Angular (dossier qui contient angular.json).' });
  } else {
    const s = SUPPORT[maj];
    const finSupport = s?.fin ?? null;
    const horsSupport = !s || (finSupport && finSupport < date);
    const ecart = DERNIERE_MAJEURE - maj;
    if (horsSupport) {
      add({ id: 'VER-001', axe: 'versions', severity: 'P1', title: `Angular ${maj} n'est plus supporté${finSupport ? ` depuis le ${finSupport}` : ''}`, detail: `Version installée : ${p.angular.version}. Plus aucun correctif de sécurité officiel. Écart avec la dernière version : ${ecart} version(s) majeure(s).`, reco: `Planifier la montée vers Angular ${DERNIERE_MAJEURE}, une version majeure à la fois (\`ng update\`), voir l'estimation.` });
    } else if (s.finActive && s.finActive < date) {
      const jours = Math.round((new Date(finSupport) - new Date(date)) / 86_400_000);
      add({ id: 'VER-002', axe: 'versions', severity: jours < 120 ? 'P2' : 'P3', title: `Angular ${maj} est en support long terme jusqu'au ${finSupport}`, detail: `Version installée : ${p.angular.version}. ${jours} jours de correctifs de sécurité restants.`, reco: `Monter en ${DERNIERE_MAJEURE} avant la fin du support.` });
    }
    // Paquets @angular/* désalignés
    const ang = p.dependances.filter((d) => d.name.startsWith('@angular/') && d.version && !['@angular/flex-layout', '@angular/http'].includes(d.name) && !d.name.startsWith('@angular-devkit'));
    const desal = ang.filter((d) => majeure(d.version) !== maj && !['@angular/cli', '@angular/build'].includes(d.name) ? true : (['@angular/cli', '@angular/build'].includes(d.name) && majeure(d.version) !== maj));
    if (desal.length) add({ id: 'VER-003', axe: 'versions', severity: 'P2', title: 'Paquets Angular de versions majeures différentes', detail: desal.map((d) => `${d.name} ${d.version}`).join(', '), reco: 'Aligner tous les paquets @angular/* sur la même version majeure (`ng update`).', count: desal.length });
    const desalTiers = p.dependances.filter((d) => ALIGNEES.includes(d.name) && d.version && majeure(d.version) !== maj);
    if (desalTiers.length) add({ id: 'VER-004', axe: 'versions', severity: 'P2', title: 'Bibliothèques liées à Angular sur une autre version majeure', detail: desalTiers.map((d) => `${d.name} ${d.version}`).join(', '), reco: 'Monter ces bibliothèques avec Angular, chacune avec ses notes de migration.', count: desalTiers.length });
  }
  for (const r of DEPENDANCES_A_RISQUE) {
    const d = p.dependances.find((x) => x.name === r.nom);
    if (d) add({ id: `DEP-${r.nom}`, axe: r.axe, severity: r.sev, title: r.titre, detail: `${d.name} ${d.version ?? d.plage}${d.dev ? ' (développement)' : ''}`, reco: r.reco });
  }
  const rx = majeure(p.versions.rxjs);
  if (rx != null && rx < 7) add({ id: 'VER-010', axe: 'versions', severity: 'P2', title: `RxJS ${p.versions.rxjs} : Angular demande RxJS 7 depuis la v14`, detail: 'Montée RxJS 6 → 7 obligatoire avant Angular 15+ (toPromise déprécié, types plus stricts).', reco: 'Monter RxJS en 7.8, remplacer toPromise() par firstValueFrom / lastValueFrom.' });
  const tsMaj = majeure(p.versions.typescript);
  if (tsMaj != null && tsMaj < 5) add({ id: 'VER-011', axe: 'versions', severity: 'P3', title: `TypeScript ${p.versions.typescript}`, detail: 'Angular 17+ demande TypeScript 5.2 ou plus.', reco: 'Monter TypeScript avec Angular (géré par `ng update`).' });
  if (!p.sourceVersions) add({ id: 'VER-012', axe: 'versions', severity: 'P3', title: 'Aucun fichier de verrouillage des dépendances', detail: 'Ni package-lock.json, ni yarn.lock, ni pnpm-lock.yaml, ni bun.lock : les builds ne sont pas reproductibles, versions lues dans les plages de package.json.', reco: 'Versionner le fichier de verrouillage et utiliser `npm ci` en CI.' });

  // ---------- Axe migration (signals, standalone, v22) ----------
  if (maj != null && maj < 14) add({ id: 'MIG-000', axe: 'migration', severity: 'P1', title: 'Version antérieure aux composants standalone', detail: 'Les migrations automatiques (standalone, control flow, signal inputs) supposent Angular 15 à 17 au minimum.', reco: 'Monter d\'abord la version, puis lancer les migrations officielles.' });
  const nonStandalone = composants.filter((c) => !estStandalone(c));
  if (modules.length) add({ id: 'MIG-001', axe: 'migration', severity: modules.length > 10 ? 'P2' : 'P3', title: `${modules.length} NgModule(s), ${nonStandalone.length} composant(s) non standalone`, detail: `${indicateurs.pctStandalone ?? 0} % des composants sont standalone.`, reco: 'Migration officielle : `ng generate @angular/core:standalone` (3 passes), puis supprimer les modules vides.', ...emp(modules.map((m) => ({ fichier: m.fichier, ligne: m.ligne, info: `${m.nom} (${m.declarations} déclarations)` }))) });
  if (ancienCF) add({ id: 'MIG-002', axe: 'migration', severity: 'P3', title: `${ancienCF} directive(s) structurelle(s) *ngIf / *ngFor / ngSwitch`, detail: `${indicateurs.pctControleFluxNouveau ?? 0} % du contrôle de flux utilise la syntaxe @if / @for / @switch.`, reco: 'Migration officielle : `ng generate @angular/core:control-flow`. Les *ngFor deviennent @for avec `track` obligatoire.', count: ancienCF, ...emp(gab.filter((g) => g.ancienControle.ngIf + g.ancienControle.ngFor + g.ancienControle.ngSwitch).map((g) => ({ fichier: g.fichier, ligne: null, info: `${g.ancienControle.ngIf + g.ancienControle.ngFor + g.ancienControle.ngSwitch} occurrence(s)` }))), count: ancienCF });
  if (decoIO) add({ id: 'MIG-003', axe: 'migration', severity: 'P3', title: `${decoIO} @Input / @Output à décorateur`, detail: `${indicateurs.pctEntreesSortiesSignals ?? 0} % des entrées / sorties utilisent input() / output() / model().`, reco: 'Migrations officielles : `ng generate @angular/core:signal-input-migration` et `output-migration`. Revoir à la main les entrées modifiées dans le composant.', count: decoIO, ...emp(ts.filter((f) => f.decorateursAnciens.Input + f.decorateursAnciens.Output).map((f) => ({ fichier: f.fichier, ligne: null, info: `${f.decorateursAnciens.Input} @Input, ${f.decorateursAnciens.Output} @Output` }))) });
  if (decoQueries) add({ id: 'MIG-004', axe: 'migration', severity: 'P4', title: `${decoQueries} requête(s) @ViewChild / @ContentChild à décorateur`, detail: 'Les requêtes signals (viewChild(), contentChild()) suppriment les problèmes de cycle de vie (ngAfterViewInit).', reco: 'Migration officielle : `ng generate @angular/core:signal-queries-migration`.', count: decoQueries });
  if (ctorInj > 0 && (indicateurs.pctInject ?? 0) < 50) add({ id: 'MIG-005', axe: 'migration', severity: 'P4', title: `${ctorInj} injection(s) par constructeur`, detail: `${indicateurs.pctInject ?? 0} % des injections utilisent inject().`, reco: 'Migration officielle : `ng generate @angular/core:inject`.', count: ctorInj });
  if (!zoneless && nbComp) {
    const zoneUses = ts.filter((f) => f.ngZone.length);
    add({ id: 'MIG-006', axe: 'migration', severity: 'P3', title: 'Application dépendante de zone.js', detail: `${nonOnPush.length} composant(s) sur ${nbComp} sans ChangeDetectionStrategy.OnPush ; ${zoneUses.length} fichier(s) importent NgZone. Depuis Angular 21, les nouvelles applications sont sans zone.js par défaut.`, reco: 'Passer les composants en OnPush, remplacer les mutations par des signals, retirer NgZone, puis `provideZonelessChangeDetection()`. Outil MCP officiel : `onpush_zoneless_migration`.', count: nonOnPush.length, ...emp(zoneUses.map((f) => ({ fichier: f.fichier, ligne: f.ngZone[0], info: 'import de NgZone' }))) });
  }
  if (indicateurs.subscribe > 0 && indicateurs.signalsEtat === 0) add({ id: 'MIG-007', axe: 'migration', severity: 'P4', title: 'Aucun état en signals', detail: `${indicateurs.subscribe} appel(s) à subscribe(), 0 signal() / computed().`, reco: 'Commencer par les états locaux des composants (signal, computed) et toSignal() pour les flux HTTP.' });

  // ---------- Axe qualité ----------
  if (!p.tsconfig.strict) add({ id: 'QUA-001', axe: 'qualite', severity: 'P2', title: 'Mode strict TypeScript désactivé', detail: `strict : false${p.tsconfig.noImplicitAny ? '' : ', noImplicitAny : false'}.`, reco: 'Activer `strict` progressivement (d\'abord noImplicitAny et strictNullChecks, dossier par dossier).' });
  if (!p.tsconfig.strictTemplates && p.angularJson) add({ id: 'QUA-002', axe: 'qualite', severity: 'P2', title: 'Vérification stricte des gabarits désactivée', detail: 'angularCompilerOptions.strictTemplates n\'est pas activé : les erreurs de type dans les gabarits passent la compilation.', reco: 'Activer `strictTemplates` et corriger les erreurs remontées.' });
  const anyListe = ts.flatMap((f) => f.any.map((l) => ({ fichier: f.fichier, ligne: l })));
  if (anyListe.length) {
    const densite = lignesTs ? (anyListe.length / lignesTs) * 1000 : 0;
    add({ id: 'QUA-003', axe: 'qualite', severity: densite > 5 ? 'P2' : densite > 1 ? 'P3' : 'P4', title: `${anyListe.length} type(s) any`, detail: `${densite.toFixed(1)} pour 1 000 lignes de TypeScript.`, reco: 'Remplacer par des types métier ou unknown, interdire avec @typescript-eslint/no-explicit-any.', ...emp(anyListe) });
  }
  if (!p.outillage.eslint) add({ id: 'QUA-004', axe: 'qualite', severity: 'P2', title: 'Pas de linter ESLint', detail: p.outillage.tslint ? 'TSLint seulement (abandonné).' : 'Aucune configuration de lint trouvée.', reco: '`ng add @angular-eslint/schematics`, règles recommandées + gabarits.' });
  const consoleL = ts.flatMap((f) => f.console.map((l) => ({ fichier: f.fichier, ligne: l })));
  if (consoleL.length) add({ id: 'QUA-005', axe: 'qualite', severity: 'P4', title: `${consoleL.length} appel(s) console.*`, detail: 'Traces qui partent en production.', reco: 'Passer par un service de journalisation ; règle ESLint no-console.', ...emp(consoleL) });
  const ignores = ts.reduce((s, f) => s + f.tsIgnore, 0);
  if (ignores) add({ id: 'QUA-006', axe: 'qualite', severity: 'P4', title: `${ignores} @ts-ignore / @ts-nocheck`, detail: 'Erreurs de type masquées.', reco: 'Préférer @ts-expect-error avec un commentaire, puis corriger.', count: ignores });
  const gros = composants.filter((c) => c.lignesClasse > 400);
  if (gros.length) add({ id: 'QUA-007', axe: 'qualite', severity: 'P3', title: `${gros.length} composant(s) de plus de 400 lignes`, detail: 'Composants difficiles à tester et à faire évoluer.', reco: 'Extraire la logique dans des services ou des composants enfants.', ...emp(gros.map((c) => ({ fichier: c.fichier, ligne: c.ligne, info: `${c.nom} : ${c.lignesClasse} lignes` }))) });
  const compAvecSpec = new Set(specs.map((s) => s.fichier.replace(/\.spec\.ts$/, '.ts')));
  const fichiersComp = [...new Set(composants.map((c) => c.fichier))];
  const sansSpec = fichiersComp.filter((f) => !compAvecSpec.has(f));
  const pctSpec = ratio(fichiersComp.length - sansSpec.length, fichiersComp.length);
  indicateurs.pctComposantsTestes = pctSpec;
  if (fichiersComp.length && (pctSpec ?? 0) < 50) add({ id: 'QUA-008', axe: 'qualite', severity: (pctSpec ?? 0) < 10 ? 'P2' : 'P3', title: `${pctSpec ?? 0} % des fichiers de composants ont un test`, detail: `${sansSpec.length} fichier(s) de composants sans fichier .spec.ts voisin (présence seulement : la couverture réelle demande d'exécuter les tests).`, reco: 'Tester d\'abord les composants à logique ; viser les écrans critiques avant la montée de version.', count: sansSpec.length });
  if (p.outillage.karma && !p.outillage.vitest && !p.outillage.jest) add({ id: 'QUA-009', axe: 'qualite', severity: 'P3', title: 'Tests unitaires sous Karma', detail: 'Karma est déprécié par son équipe ; Vitest est le lanceur par défaut des nouveaux projets Angular depuis la v21.', reco: 'Migrer vers Vitest (schematic expérimental `@schematics/angular:refactor-jasmine-vitest`) ou Jest.' });
  if (!p.outillage.ci.length) add({ id: 'QUA-010', axe: 'qualite', severity: 'P3', title: 'Aucune intégration continue détectée', detail: 'Ni GitHub Actions, ni GitLab CI, ni Jenkinsfile, ni Azure Pipelines à la racine.', reco: 'Pipeline minimal : installation `npm ci`, lint, tests, build de production.' });
  if (!p.outillage.playwright && !p.outillage.cypress && !p.outillage.protractor) add({ id: 'QUA-011', axe: 'qualite', severity: 'P3', title: 'Aucun test de bout en bout', detail: 'Pas de Playwright, Cypress ni Protractor.', reco: 'Couvrir les 5 parcours critiques avec Playwright avant la migration : ce sont eux qui sécurisent la recette.' });

  // ---------- Axe sécurité ----------
  const sec = (regle) => ts.flatMap((f) => f.securite.filter((s) => s.regle === regle).map((s) => ({ fichier: f.fichier, ligne: s.ligne, info: s.detail })));
  const bypass = sec('bypass');
  if (bypass.length) add({ id: 'SEC-001', axe: 'securite', severity: 'P1', title: `${bypass.length} contournement(s) du nettoyage Angular (bypassSecurityTrust*)`, detail: 'Chaque appel désactive la protection contre l\'injection de script (XSS) pour la valeur passée.', reco: 'Vérifier que la valeur ne vient jamais d\'une saisie ou d\'une API ; sinon nettoyer côté serveur ou utiliser DomSanitizer.sanitize.', ...emp(bypass) });
  const innerHtml = gab.flatMap((g) => g.innerHtml.map((l) => ({ fichier: g.fichier, ligne: l })));
  if (innerHtml.length) add({ id: 'SEC-002', axe: 'securite', severity: 'P3', title: `${innerHtml.length} liaison(s) [innerHTML]`, detail: 'Angular nettoie la valeur, mais le contenu riche reste une surface d\'attaque, surtout combiné à bypassSecurityTrustHtml.', reco: 'Limiter à du contenu de confiance ; préférer des composants.', ...emp(innerHtml) });
  const dom = [...sec('dom-html'), ...sec('document-write')];
  if (dom.length) add({ id: 'SEC-003', axe: 'securite', severity: 'P2', title: `${dom.length} écriture(s) HTML directe(s) dans le DOM`, detail: 'innerHTML / outerHTML / document.write contournent entièrement le nettoyage d\'Angular.', reco: 'Passer par les liaisons de gabarit ou Renderer2.', ...emp(dom) });
  const ev = sec('eval');
  if (ev.length) add({ id: 'SEC-004', axe: 'securite', severity: 'P1', title: `${ev.length} évaluation(s) de code dynamique`, detail: 'eval() / new Function() : exécution de code arbitraire, incompatible avec une politique CSP stricte.', reco: 'Supprimer ; utiliser des tables de correspondance ou un analyseur dédié.', ...emp(ev) });
  const jet = sec('jeton-stockage');
  if (jet.length) add({ id: 'SEC-005', axe: 'securite', severity: 'P2', title: `${jet.length} jeton(s) d'authentification en localStorage / sessionStorage`, detail: 'Lisible par tout script de la page en cas de faille XSS.', reco: 'Préférer un cookie HttpOnly, Secure, SameSite posé par le serveur.', ...emp(jet) });
  const secrets = sec('secret');
  if (secrets.length) add({ id: 'SEC-006', axe: 'securite', severity: 'P1', title: `${secrets.length} secret(s) potentiel(s) dans le code front`, detail: 'Tout ce qui est dans le bundle est public. Valeurs masquées dans ce rapport.', reco: 'Révoquer la clé, la déplacer côté serveur, purger l\'historique Git.', ...emp(secrets) });
  const google = sec('cle-google');
  if (google.length) add({ id: 'SEC-008', axe: 'securite', severity: 'P2', title: `${google.length} clé(s) d'API Google dans le code`, detail: 'Une clé Google côté navigateur est publique par nature ; le risque est une clé sans restriction, utilisable par n\'importe qui à vos frais. Valeur masquée dans ce rapport.', reco: 'Vérifier dans la console Google Cloud que la clé est restreinte par référent HTTP et par API ; la passer en configuration d\'environnement.', ...emp(google) });
  const http = sec('http-clair');
  if (http.length) add({ id: 'SEC-007', axe: 'securite', severity: 'P3', title: `${http.length} URL(s) en http:// non chiffré`, detail: 'Contenu mixte bloqué par les navigateurs en HTTPS, ou trafic en clair.', reco: 'Passer en https:// ou en chemins relatifs configurés par environnement.', ...emp(http) });

  // ---------- Axe performance ----------
  if (p.builder && /build-angular:browser$/.test(p.builder)) add({ id: 'PER-001', axe: 'performance', severity: 'P2', title: 'Constructeur webpack historique (browser)', detail: `builder : ${p.builder}. Le constructeur « application » (esbuild + Vite) est le défaut depuis Angular 17 : builds 2 à 4 fois plus rapides selon l'équipe Angular.`, reco: 'Migration officielle : `ng update @angular/cli --name use-application-builder`.' });
  if (p.angularJson && !p.budgets.includes('initial')) add({ id: 'PER-002', axe: 'performance', severity: 'P3', title: 'Pas de budget sur le bundle initial', detail: `Budgets configurés : ${p.budgets.length ? p.budgets.join(', ') : 'aucun'}.`, reco: 'Ajouter un budget « initial » (avertissement / erreur) dans la configuration de production.' });
  if (p.prod.sourceMap === true) add({ id: 'PER-003', axe: 'performance', severity: 'P4', title: 'Source maps publiées en production', detail: 'Le code source lisible est servi aux visiteurs.', reco: 'Désactiver ou utiliser `hidden` et téléverser les cartes vers l\'outil de suivi d\'erreurs.' });
  if (routesDir + routesDiff >= 5 && (indicateurs.pctRoutesDifferees ?? 0) < 30) add({ id: 'PER-004', axe: 'performance', severity: 'P3', title: `${indicateurs.pctRoutesDifferees ?? 0} % des routes chargées à la demande`, detail: `${routesDiff} route(s) différée(s), ${routesDir} chargée(s) d'emblée.`, reco: 'Charger les fonctionnalités avec loadComponent / loadChildren, et @defer pour les blocs lourds.' });
  const sansTrack = gab.flatMap((g) => g.ngForSansTrack.map((l) => ({ fichier: g.fichier, ligne: l })));
  if (sansTrack.length) add({ id: 'PER-005', axe: 'performance', severity: 'P4', title: `${sansTrack.length} *ngFor sans trackBy`, detail: 'Toute la liste est recréée dans le DOM à chaque changement de référence.', reco: 'La migration vers @for impose `track` et règle le point.', ...emp(sansTrack) });
  const appels = gab.flatMap((g) => g.appelsDansInterpolation.map((l) => ({ fichier: g.fichier, ligne: l })));
  if (appels.length > 5) add({ id: 'PER-006', axe: 'performance', severity: 'P4', title: `${appels.length} appel(s) de méthode avec argument dans les gabarits`, detail: 'Réévalués à chaque détection de changement.', reco: 'Remplacer par computed() ou un pipe pur.', ...emp(appels) });
  if (p.assetsLourds.length) add({ id: 'PER-007', axe: 'performance', severity: 'P3', title: `${p.assetsLourds.length} fichier(s) statique(s) de plus de 500 Ko`, detail: p.assetsLourds.slice(0, 5).map((a) => `${a.fichier} (${a.ko} Ko)`).join(', '), reco: 'Compresser (WebP / AVIF), redimensionner, NgOptimizedImage.', ...emp(p.assetsLourds.map((a) => ({ fichier: a.fichier, ligne: null, info: `${a.ko} Ko` }))) });
  const lodash = ts.flatMap((f) => f.imports.filter((i) => i.module === 'lodash').map((i) => ({ fichier: f.fichier, ligne: i.ligne })));
  if (lodash.length) add({ id: 'PER-008', axe: 'performance', severity: 'P4', title: `${lodash.length} import(s) de lodash complet`, detail: 'lodash (CommonJS) n\'est pas élagable : la bibliothèque entière part dans le bundle.', reco: 'Utiliser lodash-es ou les fonctions natives.', ...emp(lodash) });

  return { constats: C, indicateurs };
}
