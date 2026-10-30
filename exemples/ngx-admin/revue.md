## Client
ngx-admin · akveo

## Synthèse
ngx-admin est un modèle de tableau de bord très diffusé, figé en **Angular 15.2** depuis septembre 2024. Angular 15 ne reçoit plus de correctifs de sécurité : c'est le premier risque, avant toute question de style de code.

La migration vers Angular 22 est faisable mais lourde, pour trois raisons mesurées ici : l'outillage est d'une autre époque (TSLint, Protractor, Karma sans aucun test, constructeur webpack, RxJS 6 avec rxjs-compat), l'application dépend entièrement de zone.js (1 composant OnPush sur 144), et plusieurs bibliothèques suivent les versions d'Angular, à commencer par **Nebular**, sur laquelle repose toute l'interface.

Côté sécurité, `npm audit` relève **10 vulnérabilités critiques et 90 hautes** dans les dépendances. Elles viennent pour l'essentiel de l'outillage de build ancien (node-sass, constructeur webpack, CLI 15) et des paquets Angular 15 eux-mêmes : la montée de version est le correctif, pas `npm audit fix --force`. Le second point est une clé d'API Google écrite dans `app.module.ts` ; dans un projet de démonstration c'est acceptable si la clé est restreinte, dans une application dérivée il faut la remplacer.

Ordre de grandeur pour un développeur : **12 à 32 jours** pour revenir sur une version supportée, puis **11 à 30 jours** de modernisation (standalone, signals, sans zone.js), qui peut attendre.

## Remarques par constat
- SEC-101 : sur les 100 vulnérabilités critiques ou hautes, la plupart sont dans des dépendances de développement (node-sass, CLI, compodoc, protractor) qui ne partent pas en production ; celles de @angular/core, @angular/common, @angular/router, chart.js et tinymce, elles, sont livrées aux utilisateurs. Elles justifient à elles seules la montée de version.
- VER-001 : la montée se fait version par version (15 → 16 → … → 22) ; chaque étape `ng update` est courte, ce sont les bibliothèques tierces qui allongent.
- VER-004 : @angular/google-maps est resté en 12 alors que le cœur est en 15 ; à aligner dès la première étape.
- DEP-angular2-chartjs : utilisé par les pages de graphiques de démonstration ; ngx-echarts couvre déjà le besoin dans le même projet, on peut supprimer plutôt que remplacer.
- DEP-protractor : le dossier e2e ne contient aucun scénario ; il suffit de retirer Protractor et de créer 3 à 5 parcours Playwright (connexion, tableau de bord, une page de formulaire).
- QUA-008 : aucun fichier de test unitaire. Pour sécuriser la migration, les parcours Playwright ci-dessus apportent plus que des tests unitaires écrits après coup.
- QUA-003 : 180 `any`, surtout dans les données de démonstration et les graphiques ; ne bloque pas la montée de version, à traiter avec le mode strict.
- SEC-008 : clé passée à `NbChatModule.forRoot({ messageGoogleMapKey })`. Vérifier sa restriction par référent HTTP ; dans un produit dérivé, la lire depuis l'environnement.
- MIG-006 : seule l'icônothèque est en OnPush. Le passage sans zone.js est le lot le plus long ; il n'est pas obligatoire pour être à jour et peut suivre en second temps.
- PER-007 : `world.json` (987 Ko) sert la carte de démonstration ; à charger à la demande avec la page des cartes.

## Ajustement de l'estimation
Le calcul automatique donne 23 à 62 jours. La fourchette haute suppose que tout est fait en une fois. En séparant la mise à jour (lots version, dépendances, RxJS, constructeur, outillage, recette : **12 à 32 jours**) de la modernisation (standalone, signals, sans zone.js, mode strict : **11 à 30 jours**), la première phase suffit à revenir sur une version supportée. Le risque principal reste la disponibilité de versions de Nebular compatibles avec chaque version d'Angular : à vérifier avant de chiffrer ferme.

## Plan d'action
1. Appliquer les correctifs `npm audit fix` sans changement de version majeure, vérifier la compatibilité Nebular par version d'Angular et la restriction de la clé Google (1 jour).
2. Retirer TSLint, Codelyzer et Protractor ; installer ESLint et 3 à 5 parcours Playwright qui serviront de recette.
3. Monter RxJS en 7 (supprimer rxjs-compat), puis Angular de 15 à 22 une version à la fois, en alignant @angular/google-maps, Nebular et ngx-echarts à chaque étape.
4. Passer au constructeur application (esbuild) et à Vitest ; ajouter un budget sur le bundle initial.
5. Seconde phase : composants standalone et nouveau contrôle de flux (migrations officielles), entrées en signals, puis passage progressif en OnPush et sortie de zone.js.
