# Audit Angular · ngx-admin · akveo

Date : 2026-10-23 · Angular 15.2.10 · audit-angular 1.0.0 · indice global **40/100** · migration estimée **23 à 62 j**

## Synthèse

ngx-admin est un modèle de tableau de bord très diffusé, figé en **Angular 15.2** depuis septembre 2024. Angular 15 ne reçoit plus de correctifs de sécurité : c'est le premier risque, avant toute question de style de code.

La migration vers Angular 22 est faisable mais lourde, pour trois raisons mesurées ici : l'outillage est d'une autre époque (TSLint, Protractor, Karma sans aucun test, constructeur webpack, RxJS 6 avec rxjs-compat), l'application dépend entièrement de zone.js (1 composant OnPush sur 144), et plusieurs bibliothèques suivent les versions d'Angular, à commencer par **Nebular**, sur laquelle repose toute l'interface.

Côté sécurité, `npm audit` relève **10 vulnérabilités critiques et 90 hautes** dans les dépendances. Elles viennent pour l'essentiel de l'outillage de build ancien (node-sass, constructeur webpack, CLI 15) et des paquets Angular 15 eux-mêmes : la montée de version est le correctif, pas `npm audit fix --force`. Le second point est une clé d'API Google écrite dans `app.module.ts` ; dans un projet de démonstration c'est acceptable si la clé est restreinte, dans une application dérivée il faut la remplacer.

Ordre de grandeur pour un développeur : **12 à 32 jours** pour revenir sur une version supportée, puis **11 à 30 jours** de modernisation (standalone, signals, sans zone.js), qui peut attendre.

## Indices par axe

| Axe | Indice |
|---|---:|
| Versions et dépendances | 8 |
| Préparation signals et v22 | 67 |
| Qualité et tests | 11 |
| Sécurité | 58 |
| Performance | 71 |
| **Global** | **40** |

## Constats

| Prio. | Id | Constat | Action |
|---|---|---|---|
| P1 | SEC-101 | 100 vulnérabilité(s) critique(s) ou haute(s) dans les dépendances | Appliquer les correctifs disponibles (`npm audit fix`, sans --force) ; pour les autres, la montée de version d'Angular et des bibliothèques est le correctif. |
| P1 | VER-001 | Angular 15 n'est plus supporté | Planifier la montée vers Angular 22, une version majeure à la fois (`ng update`), voir l'estimation. |
| P2 | DEP-angular2-chartjs | angular2-chartjs n'est plus maintenu | Remplacer par ng2-charts ou une intégration directe de Chart.js. |
| P2 | DEP-node-sass | node-sass est abandonné | Utiliser sass (Dart Sass), déjà inclus dans le CLI Angular. |
| P2 | DEP-protractor | Protractor est arrêté depuis 2023 | Réécrire les tests de bout en bout avec Playwright ou Cypress. |
| P2 | DEP-rxjs-compat | rxjs-compat maintient l'API de RxJS 5 | Réécrire les imports et opérateurs, puis supprimer rxjs-compat. |
| P2 | DEP-tslint | TSLint est abandonné depuis 2019 | Passer à ESLint avec angular-eslint (`ng add @angular-eslint/schematics`). |
| P2 | MIG-001 | 29 NgModule(s), 144 composant(s) non standalone | Migration officielle : `ng generate @angular/core:standalone` (3 passes), puis supprimer les modules vides. |
| P2 | PER-001 | Constructeur webpack historique (browser) | Migration officielle : `ng update @angular/cli --name use-application-builder`. |
| P2 | QUA-001 | Mode strict TypeScript désactivé | Activer `strict` progressivement (d'abord noImplicitAny et strictNullChecks, dossier par dossier). |
| P2 | QUA-002 | Vérification stricte des gabarits désactivée | Activer `strictTemplates` et corriger les erreurs remontées. |
| P2 | QUA-003 | 180 type(s) any | Remplacer par des types métier ou unknown, interdire avec @typescript-eslint/no-explicit-any. |
| P2 | QUA-008 | 0 % des fichiers de composants ont un test | Tester d'abord les composants à logique ; viser les écrans critiques avant la montée de version. |
| P2 | SEC-008 | 1 clé(s) d'API Google dans le code | Vérifier dans la console Google Cloud que la clé est restreinte par référent HTTP et par API ; la passer en configuration d'environnement. |
| P2 | VER-003 | Paquets Angular de versions majeures différentes | Aligner tous les paquets @angular/* sur la même version majeure (`ng update`). |
| P2 | VER-010 | RxJS 6.6.2 : Angular demande RxJS 7 depuis la v14 | Monter RxJS en 7.8, remplacer toPromise() par firstValueFrom / lastValueFrom. |
| P3 | DEP-codelyzer | Codelyzer (règles TSLint) est abandonné | Supprimer avec TSLint, règles équivalentes dans angular-eslint. |
| P3 | MIG-002 | 47 directive(s) structurelle(s) *ngIf / *ngFor / ngSwitch | Migration officielle : `ng generate @angular/core:control-flow`. Les *ngFor deviennent @for avec `track` obligatoire. |
| P3 | MIG-003 | 62 @Input / @Output à décorateur | Migrations officielles : `ng generate @angular/core:signal-input-migration` et `output-migration`. Revoir à la main les entrées modifiées dans le composant. |
| P3 | MIG-006 | Application dépendante de zone.js | Passer les composants en OnPush, remplacer les mutations par des signals, retirer NgZone, puis `provideZonelessChangeDetection()`. Outil MCP officiel : `onpush_zoneless_migration`. |
| P3 | PER-002 | Pas de budget sur le bundle initial | Ajouter un budget « initial » (avertissement / erreur) dans la configuration de production. |
| P3 | PER-004 | 15 % des routes chargées à la demande | Charger les fonctionnalités avec loadComponent / loadChildren, et @defer pour les blocs lourds. |
| P3 | PER-007 | 2 fichier(s) statique(s) de plus de 500 Ko | Compresser (WebP / AVIF), redimensionner, NgOptimizedImage. |
| P3 | QUA-007 | 1 composant(s) de plus de 400 lignes | Extraire la logique dans des services ou des composants enfants. |
| P3 | QUA-009 | Tests unitaires sous Karma | Migrer vers Vitest (schematic expérimental `@schematics/angular:refactor-jasmine-vitest`) ou Jest. |
| P3 | SEC-007 | 2 URL(s) en http:// non chiffré | Passer en https:// ou en chemins relatifs configurés par environnement. |
| P3 | VER-011 | TypeScript 4.9.5 | Monter TypeScript avec Angular (géré par `ng update`). |
| P4 | DEP-ngx-echarts | Bibliothèque de graphiques liée aux versions d'Angular | Vérifier la version compatible avant la montée. |
| P4 | MIG-004 | 8 requête(s) @ViewChild / @ContentChild à décorateur | Migration officielle : `ng generate @angular/core:signal-queries-migration`. |
| P4 | MIG-005 | 136 injection(s) par constructeur | Migration officielle : `ng generate @angular/core:inject`. |
| P4 | MIG-007 | Aucun état en signals | Commencer par les états locaux des composants (signal, computed) et toSignal() pour les flux HTTP. |
| P4 | PER-005 | 43 *ngFor sans trackBy | La migration vers @for impose `track` et règle le point. |
| P4 | QUA-005 | 1 appel(s) console.* | Passer par un service de journalisation ; règle ESLint no-console. |

### SEC-101 · 100 vulnérabilité(s) critique(s) ou haute(s) dans les dépendances

npm audit : 10 critique(s), 90 haute(s), 42 modérée(s), 12 faible(s).

> Avis de l'auditeur : sur les 100 vulnérabilités critiques ou hautes, la plupart sont dans des dépendances de développement (node-sass, CLI, compodoc, protractor) qui ne partent pas en production ; celles de @angular/core, @angular/common, @angular/router, chart.js et tinymce, elles, sont livrées aux utilisateurs. Elles justifient à elles seules la montée de version.

- `form-data` critical, correctif : node-sass@9.0.0 (majeure)
- `handlebars` critical, correctif : oui
- `loader-utils` critical, correctif : oui
- `piscina` critical, correctif : @angular-devkit/build-angular@21.2.28 (majeure)
- `proxy-addr` critical, correctif : oui
- `request` critical, correctif : node-sass@9.0.0 (majeure)
- `shell-quote` critical, correctif : oui
- `socket.io-parser` critical, correctif : oui
- `tar` critical, correctif : @angular/cli@21.2.28 (majeure)
- `websocket-driver` critical, correctif : oui
- `@angular-devkit/build-angular` high, direct, correctif : @angular-devkit/build-angular@21.2.28 (majeure)
- `@angular/cli` high, direct, correctif : @angular/cli@21.2.28 (majeure)
- `@angular/common` high, direct, correctif : @angular/common@21.2.25 (majeure)
- `@angular/compiler` high, direct, correctif : @angular/compiler@21.2.25 (majeure)
- `@angular/core` high, direct, correctif : @angular/core@21.2.25 (majeure)
- `@angular/router` high, direct, correctif : @angular/router@21.2.25 (majeure)
- `@babel/plugin-transform-modules-systemjs` high, correctif : oui
- `@compodoc/compodoc` high, direct, correctif : @compodoc/compodoc@1.2.1
- `@npmcli/run-script` high, correctif : @angular/cli@21.2.28 (majeure)
- `@sigstore/sign` high, correctif : @angular/cli@21.2.28 (majeure)
- `@sigstore/tuf` high, correctif : @angular/cli@21.2.28 (majeure)
- `@swimlane/ngx-charts` high, direct, correctif : @swimlane/ngx-charts@25.0.3 (majeure)
- `adm-zip` high, correctif : protractor@6.0.0 (majeure)
- `autoprefixer` high, correctif : stylelint@17.16.0 (majeure)
- `body-parser` high, correctif : oui
- … 75 de plus

### MIG-001 · 29 NgModule(s), 144 composant(s) non standalone

0 % des composants sont standalone.

- `src/app/@core/core.module.ts:148` CoreModule (0 déclarations)
- `src/app/@core/mock/mock-data.module.ts:48` MockDataModule (0 déclarations)
- `src/app/@theme/theme.module.ts:73` ThemeModule (2 déclarations)
- `src/app/app-routing.module.ts:56` AppRoutingModule (0 déclarations)
- `src/app/app.module.ts:24` AppModule (1 déclarations)
- `src/app/pages/charts/charts-routing.module.ts:24` ChartsRoutingModule (0 déclarations)
- `src/app/pages/charts/charts.module.ts:52` ChartsModule (2 déclarations)
- `src/app/pages/dashboard/dashboard.module.ts:34` DashboardModule (16 déclarations)
- `src/app/pages/e-commerce/e-commerce.module.ts:59` ECommerceModule (32 déclarations)
- `src/app/pages/editors/editors-routing.module.ts:20` EditorsRoutingModule (0 déclarations)
- `src/app/pages/editors/editors.module.ts:9` EditorsModule (1 déclarations)
- `src/app/pages/extra-components/extra-components-routing.module.ts:43` ExtraComponentsRoutingModule (0 déclarations)
- `src/app/pages/extra-components/extra-components.module.ts:78` ExtraComponentsModule (1 déclarations)
- `src/app/pages/forms/forms-routing.module.ts:39` FormsRoutingModule (0 déclarations)
- `src/app/pages/forms/forms.module.ts:23` FormsModule (5 déclarations)
- `src/app/pages/layout/layout-routing.module.ts:53` LayoutRoutingModule (0 déclarations)
- `src/app/pages/layout/layout.module.ts:25` LayoutModule (10 déclarations)
- `src/app/pages/maps/maps-routing.module.ts:30` MapsRoutingModule (0 déclarations)
- `src/app/pages/maps/maps.module.ts:10` MapsModule (1 déclarations)
- `src/app/pages/miscellaneous/miscellaneous-routing.module.ts:20` MiscellaneousRoutingModule (0 déclarations)
- `src/app/pages/miscellaneous/miscellaneous.module.ts:9` MiscellaneousModule (2 déclarations)
- `src/app/pages/modal-overlays/modal-overlays-routing.module.ts:37` ModalOverlaysRoutingModule (0 déclarations)
- `src/app/pages/modal-overlays/modal-overlays.module.ts:79` ModalOverlaysModule (1 déclarations)
- `src/app/pages/pages-routing.module.ts:83` PagesRoutingModule (0 déclarations)
- `src/app/pages/pages.module.ts:11` PagesModule (1 déclarations)
- … 4 de plus

### QUA-003 · 180 type(s) any

12.6 pour 1 000 lignes de TypeScript.

> Avis de l'auditeur : 180 `any`, surtout dans les données de démonstration et les graphiques ; ne bloque pas la montée de version, à traiter avec le mode strict.

- `src/app/@core/data/earning.ts:18`
- `src/app/@core/data/smart-table.ts:3`
- `src/app/@core/mock/earning.service.ts:82`
- `src/app/@core/mock/profit-bar-animation-chart.service.ts:8`
- `src/app/@core/mock/users.service.ts:42`
- `src/app/@core/module-import-guard.ts:1`
- `src/app/@core/utils/analytics.service.ts:6`
- `src/app/@core/utils/layout.service.ts:17`
- `src/app/@core/utils/layout.service.ts:21`
- `src/app/@core/utils/state.service.ts:10`
- `src/app/@core/utils/state.service.ts:29`
- `src/app/@core/utils/state.service.ts:69`
- `src/app/@core/utils/state.service.ts:69`
- `src/app/@core/utils/state.service.ts:73`
- `src/app/@core/utils/state.service.ts:77`
- `src/app/@core/utils/state.service.ts:81`
- `src/app/@core/utils/state.service.ts:81`
- `src/app/@core/utils/state.service.ts:85`
- `src/app/@core/utils/state.service.ts:89`
- `src/app/@theme/components/header/header.component.ts:18`
- `src/app/@theme/components/header/header.component.ts:56`
- `src/app/@theme/components/tiny-mce/tiny-mce.component.ts:10`
- `src/app/@theme/components/tiny-mce/tiny-mce.component.ts:12`
- `src/app/pages/charts/chartjs/chartjs-bar-horizontal.component.ts:11`
- `src/app/pages/charts/chartjs/chartjs-bar-horizontal.component.ts:12`
- … 155 de plus

### SEC-008 · 1 clé(s) d'API Google dans le code

Une clé Google côté navigateur est publique par nature ; le risque est une clé sans restriction, utilisable par n'importe qui à vos frais. Valeur masquée dans ce rapport.

> Avis de l'auditeur : clé passée à `NbChatModule.forRoot({ messageGoogleMapKey })`. Vérifier sa restriction par référent HTTP ; dans un produit dérivé, la lire depuis l'environnement.

- `src/app/app.module.ts:38` clé d'API Google (valeur masquée)

### MIG-002 · 47 directive(s) structurelle(s) *ngIf / *ngFor / ngSwitch

0 % du contrôle de flux utilise la syntaxe @if / @for / @switch.

- `src/app/pages/dashboard/traffic/traffic.component.ts` 1 occurrence(s)
- `src/app/pages/e-commerce/charts-panel/chart-panel-summary/chart-panel-summary.component.ts` 1 occurrence(s)
- `src/app/pages/tables/tree-grid/tree-grid.component.ts` 1 occurrence(s)
- `src/app/@theme/components/header/header.component.html` 1 occurrence(s)
- `src/app/pages/dashboard/contacts/contacts.component.html` 2 occurrence(s)
- `src/app/pages/dashboard/dashboard.component.html` 1 occurrence(s)
- `src/app/pages/dashboard/electricity/electricity.component.html` 3 occurrence(s)
- `src/app/pages/dashboard/rooms/room-selector/room-selector.component.html` 3 occurrence(s)
- `src/app/pages/dashboard/security-cameras/security-cameras.component.html` 3 occurrence(s)
- `src/app/pages/dashboard/temperature/temperature-dragger/temperature-dragger.component.html` 2 occurrence(s)
- `src/app/pages/e-commerce/charts-panel/chart-panel-header/chart-panel-header.component.html` 1 occurrence(s)
- `src/app/pages/e-commerce/earning-card/front-side/earning-card-front.component.html` 1 occurrence(s)
- `src/app/pages/e-commerce/legend-chart/legend-chart.component.html` 1 occurrence(s)
- `src/app/pages/e-commerce/progress-section/progress-section.component.html` 1 occurrence(s)
- `src/app/pages/e-commerce/traffic-reveal-card/front-side/traffic-front-card.component.html` 1 occurrence(s)
- `src/app/pages/e-commerce/traffic-reveal-card/traffic-cards-header/traffic-cards-header.component.html` 1 occurrence(s)
- `src/app/pages/e-commerce/user-activity/user-activity.component.html` 2 occurrence(s)
- `src/app/pages/extra-components/chat/chat.component.html` 1 occurrence(s)
- `src/app/pages/forms/buttons/buttons.component.html` 6 occurrence(s)
- `src/app/pages/layout/infinite-list/infinite-list.component.html` 4 occurrence(s)
- `src/app/pages/layout/list/list.component.html` 2 occurrence(s)
- `src/app/pages/modal-overlays/dialog/dialog.component.html` 1 occurrence(s)
- `src/app/pages/modal-overlays/toastr/toastr.component.html` 2 occurrence(s)
- `src/app/pages/tables/tree-grid/tree-grid.component.html` 1 occurrence(s)
- `src/app/pages/ui-features/icons/icons.component.html` 4 occurrence(s)
- … 22 de plus

### MIG-003 · 62 @Input / @Output à décorateur

0 % des entrées / sorties utilisent input() / output() / model().

- `src/app/@theme/components/search-input/search-input.component.ts` 0 @Input, 1 @Output
- `src/app/@theme/components/tiny-mce/tiny-mce.component.ts` 0 @Input, 1 @Output
- `src/app/pages/dashboard/electricity/electricity-chart/electricity-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/dashboard/rooms/player/player.component.ts` 1 @Input, 0 @Output
- `src/app/pages/dashboard/rooms/room-selector/room-selector.component.ts` 0 @Input, 1 @Output
- `src/app/pages/dashboard/solar/solar.component.ts` 1 @Input, 0 @Output
- `src/app/pages/dashboard/status-card/status-card.component.ts` 3 @Input, 0 @Output
- `src/app/pages/dashboard/temperature/temperature-dragger/temperature-dragger.component.ts` 13 @Input, 2 @Output
- `src/app/pages/dashboard/traffic/traffic-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/charts-panel/chart-panel-header/chart-panel-header.component.ts` 1 @Input, 1 @Output
- `src/app/pages/e-commerce/charts-panel/chart-panel-summary/chart-panel-summary.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/charts-panel/charts/orders-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/charts-panel/charts/profit-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/country-orders/chart/country-orders-chart.component.ts` 4 @Input, 0 @Output
- `src/app/pages/e-commerce/country-orders/map/country-orders-map.component.ts` 1 @Input, 1 @Output
- `src/app/pages/e-commerce/earning-card/back-side/earning-pie-chart.component.ts` 2 @Input, 1 @Output
- `src/app/pages/e-commerce/earning-card/front-side/earning-card-front.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/earning-card/front-side/earning-live-update-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/legend-chart/legend-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/profit-card/back-side/stats-area-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/profit-card/front-side/stats-bar-animation-chart.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/slide-out/slide-out.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/traffic-reveal-card/back-side/traffic-back-card.component.ts` 1 @Input, 0 @Output
- `src/app/pages/e-commerce/traffic-reveal-card/back-side/traffic-bar-chart.component.ts` 3 @Input, 0 @Output
- `src/app/pages/e-commerce/traffic-reveal-card/front-side/traffic-bar/traffic-bar.component.ts` 2 @Input, 0 @Output
- … 37 de plus

### MIG-006 · Application dépendante de zone.js

143 composant(s) sur 144 sans ChangeDetectionStrategy.OnPush ; 1 fichier(s) importent NgZone. Depuis Angular 21, les nouvelles applications sont sans zone.js par défaut.

> Avis de l'auditeur : seule l'icônothèque est en OnPush. Le passage sans zone.js est le lot le plus long ; il n'est pas obligatoire pour être à jour et peut suivre en second temps.

- `src/app/pages/maps/search-map/search/search.component.ts:1` import de NgZone
- … 142 de plus

### PER-007 · 2 fichier(s) statique(s) de plus de 500 Ko

src/assets/images/team.png (610 Ko), src/assets/map/world.json (987 Ko)

> Avis de l'auditeur : `world.json` (987 Ko) sert la carte de démonstration ; à charger à la demande avec la page des cartes.

- `src/assets/images/team.png` 610 Ko
- `src/assets/map/world.json` 987 Ko

### QUA-007 · 1 composant(s) de plus de 400 lignes

Composants difficiles à tester et à faire évoluer.

- `src/app/pages/maps/bubble/bubble-map.component.ts:8` BubbleMapComponent : 540 lignes

### SEC-007 · 2 URL(s) en http:// non chiffré

Contenu mixte bloqué par les navigateurs en HTTPS, ou trafic en clair.

- `src/app/pages/extra-components/chat/bot-replies.ts:7` http://www.reactiongifs.com/r/wnd1.gif
- `src/app/pages/extra-components/chat/bot-replies.ts:17` http://google.com

### PER-005 · 43 *ngFor sans trackBy

Toute la liste est recréée dans le DOM à chaque changement de référence.

- `src/app/pages/dashboard/traffic/traffic.component.ts:16`
- `src/app/pages/e-commerce/charts-panel/chart-panel-summary/chart-panel-summary.component.ts:8`
- `src/app/@theme/components/header/header.component.html:9`
- `src/app/pages/dashboard/contacts/contacts.component.html:6`
- `src/app/pages/dashboard/contacts/contacts.component.html:15`
- `src/app/pages/dashboard/dashboard.component.html:2`
- `src/app/pages/dashboard/electricity/electricity.component.html:8`
- `src/app/pages/dashboard/electricity/electricity.component.html:10`
- `src/app/pages/dashboard/electricity/electricity.component.html:41`
- `src/app/pages/dashboard/rooms/room-selector/room-selector.component.html:72`
- `src/app/pages/dashboard/rooms/room-selector/room-selector.component.html:78`
- `src/app/pages/dashboard/rooms/room-selector/room-selector.component.html:81`
- `src/app/pages/dashboard/security-cameras/security-cameras.component.html:32`
- `src/app/pages/dashboard/temperature/temperature-dragger/temperature-dragger.component.html:24`
- `src/app/pages/dashboard/temperature/temperature-dragger/temperature-dragger.component.html:27`
- `src/app/pages/e-commerce/charts-panel/chart-panel-header/chart-panel-header.component.html:4`
- `src/app/pages/e-commerce/earning-card/front-side/earning-card-front.component.html:3`
- `src/app/pages/e-commerce/legend-chart/legend-chart.component.html:1`
- `src/app/pages/e-commerce/progress-section/progress-section.component.html:3`
- `src/app/pages/e-commerce/traffic-reveal-card/traffic-cards-header/traffic-cards-header.component.html:4`
- `src/app/pages/e-commerce/user-activity/user-activity.component.html:6`
- `src/app/pages/e-commerce/user-activity/user-activity.component.html:11`
- `src/app/pages/extra-components/chat/chat.component.html:10`
- `src/app/pages/forms/buttons/buttons.component.html:7`
- `src/app/pages/forms/buttons/buttons.component.html:21`
- … 18 de plus

### QUA-005 · 1 appel(s) console.*

Traces qui partent en production.

- `src/main.ts:17`

## Vulnérabilités (npm audit)

info : 0 · low : 12 · moderate : 42 · high : 90 · critical : 10

## Estimation de la migration

| Lot | Base de calcul | Bas (j) | Haut (j) |
|---|---|---:|---:|
| Montée de version Angular 15 → 22 (7 étape(s) `ng update`) | 7 version(s) majeure(s) × 0,5 à 1 j × facteur de taille 1.0 | 3,5 | 7 |
| Dépendances bloquantes ou liées à Angular | 3 remplacement(s) × 1 à 3 j, 0 montée(s) de bibliothèque × 0,5 à 2 j | 3 | 9 |
| RxJS 6 → 7 | 0,5 à 2 j × facteur de taille | 0,5 | 2 |
| Passage au constructeur application (esbuild) | migration officielle + correctifs de configuration | 0,5 | 2 |
| Composants standalone, suppression des NgModules | migration officielle ; 0,05 à 0,2 j de reprise par module (29) | 1,5 | 6,5 |
| Contrôle de flux @if / @for / @switch | migration officielle ; 0,002 à 0,01 j de relecture par occurrence (47) | 0,5 | 0,5 |
| Entrées, sorties et requêtes en signals | migrations officielles ; 0,005 à 0,03 j par décorateur (70) | 0,5 | 2 |
| Injection avec inject() | migration officielle (136 paramètres) | 0,5 | 1 |
| Passage sans zone.js (OnPush, signals, recette) | 143 composant(s) à passer en OnPush × 0,03 à 0,08 j, 1 usage(s) de NgZone × 0,1 à 0,3 j, + 1 à 2 j de recette | 5,5 | 13,5 |
| Tests unitaires Karma → Vitest | 0 fichier(s) de test | 0,5 | 2 |
| Tests de bout en bout Protractor → Playwright | 0 fichier(s) e2e | 1 | 3 |
| Passage à ESLint (angular-eslint) | schematic + correction des règles | 0,5 | 1,5 |
| Mode strict TypeScript | 0,5 à 1,2 j × facteur de taille + 0,01 à 0,03 j par any (180) | 2,5 | 6,5 |
| Recette de non-régression et livraison | forfait selon le nombre de lots (13) | 2,5 | 5,5 |
| **Total** | | **23** | **62** |

Hypothèses : Développeur Angular expérimenté, migrations officielles utilisées, tests existants exécutables. Hors évolutions fonctionnelles et hors reprise de bibliothèques internes non analysées.

## Ajustement de l'auditeur

Le calcul automatique donne 23 à 62 jours. La fourchette haute suppose que tout est fait en une fois. En séparant la mise à jour (lots version, dépendances, RxJS, constructeur, outillage, recette : **12 à 32 jours**) de la modernisation (standalone, signals, sans zone.js, mode strict : **11 à 30 jours**), la première phase suffit à revenir sur une version supportée. Le risque principal reste la disponibilité de versions de Nebular compatibles avec chaque version d'Angular : à vérifier avant de chiffrer ferme.

## Plan d'action recommandé

1. Appliquer les correctifs `npm audit fix` sans changement de version majeure, vérifier la compatibilité Nebular par version d'Angular et la restriction de la clé Google (1 jour).
2. Retirer TSLint, Codelyzer et Protractor ; installer ESLint et 3 à 5 parcours Playwright qui serviront de recette.
3. Monter RxJS en 7 (supprimer rxjs-compat), puis Angular de 15 à 22 une version à la fois, en alignant @angular/google-maps, Nebular et ngx-echarts à chaque étape.
4. Passer au constructeur application (esbuild) et à Vitest ; ajouter un budget sur le bundle initial.
5. Seconde phase : composants standalone et nouveau contrôle de flux (migrations officielles), entrées en signals, puis passage progressif en OnPush et sortie de zone.js.
