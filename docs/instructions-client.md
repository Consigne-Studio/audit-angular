### Merci pour votre commande

Ce document explique comment nous transmettre les mesures de votre application. Comptez 10 minutes pour la formule Flash, 30 minutes pour Standard et Migration. Vous n'avez rien à installer dans votre projet, et votre code ne sort pas de vos machines.

Le délai de livraison (5, 10 ou 15 jours ouvrés selon la formule) court à partir de la réception de vos fichiers.

### 1. Lancer l'outil d'audit (toutes les formules)

Prérequis : Node.js 20 ou plus récent sur le poste qui a une copie du dépôt.

À la racine de l'application (le dossier qui contient `angular.json` et `package.json`) :

- `npx --yes github:consigne/audit-angular`
- Si vous ne voulez transmettre aucun nom de fichier : ajoutez `--sans-chemins`. Le rapport sera moins précis (pas d'emplacements), mais tout le reste est conservé.

L'outil lit les fichiers, n'exécute rien, n'ouvre aucune connexion réseau et écrit trois fichiers dans `./audit-angular/`. Ouvrez `rapport.html` : c'est le rapport automatique, avant notre relecture. Le fichier à nous envoyer est `audit.json`. Il ne contient pas de code source : vous pouvez l'ouvrir et le lire avant l'envoi.

Plusieurs applications dans un même dépôt : lancez l'outil dans chaque dossier d'application et envoyez un `audit.json` par application commandée.

### 2. Mesures sur l'application (Standard et Migration)

Créez un dossier `mesures/` et placez-y les fichiers JSON suivants. Les noms de fichiers sont libres : l'outil reconnaît leur contenu.

- Vulnérabilités des dépendances : `npm audit --json > mesures/npm-audit.json` (avec yarn ou pnpm : `yarn npm audit --json` ou `pnpm audit --json`).
- Poids des bundles : `npx ng build --configuration production --stats-json`, puis copiez le fichier `stats.json` produit dans `dist/<application>/` vers `mesures/`.
- Lighthouse, sur 3 écrans de votre choix (recette ou production, connectés si besoin) : `npx lighthouse <url> --output json --output-path mesures/lighthouse-1.json --chrome-flags="--headless"`, à répéter pour chaque écran. Pour un écran derrière une connexion, utilisez l'onglet Lighthouse de Chrome DevTools et « Enregistrer au format JSON ».
- Revue manuelle : choisissez 10 fichiers qui représentent votre application (composant le plus complexe, service d'accès aux données, gestion de l'authentification, routage, un écran typique…). Envoyez-les tels quels ou expurgés de ce que vous ne pouvez pas transmettre. Ce sont les seuls extraits de code que nous voyons, et uniquement si vous les envoyez.

### 3. Nous envoyer les fichiers

Écrivez à l'adresse de support indiquée sur votre reçu de commande (une réponse au reçu suffit) en joignant `audit.json`, le dossier `mesures/` compressé (Standard et Migration) et, si vous le souhaitez, quelques lignes de contexte : objectif (mise à jour, budget, reprise de projet), contraintes (qualification, recette, date butoir), bibliothèques internes.

Nous confirmons la réception sous un jour ouvré et la date de livraison.

### 4. Ce que vous recevez

- `rapport.pdf` et `rapport.html` : rapport relu, avec synthèse, avis par constat, estimation ajustée et plan d'action.
- `rapport.md` : le même contenu en Markdown.
- `tickets.csv` : un ticket par lot de migration et par constat, importable dans Jira, GitLab ou Azure DevOps.
- Standard et Migration : un lien de visio pour la restitution (45 minutes), à la date de votre choix.

Vos questions écrites restent ouvertes 30 jours après la livraison. Vos fichiers sont effacés 90 jours après la livraison, ou plus tôt sur simple demande.

### Problèmes courants

- `npx` demande une confirmation ou échoue derrière un proxy d'entreprise : configurez `npm config set proxy` et `https-proxy`, ou téléchargez l'archive du dépôt GitHub et lancez `node bin/audit-angular.mjs <chemin du dépôt>` après `npm install` dans le dossier de l'outil.
- « Aucun package.json lisible » : lancez la commande à la racine de l'application, pas dans `src/`.
- `ng build --stats-json` refusé : sur les versions anciennes, utilisez `npx ng build --prod --stats-json`.
- Annulation : tant que vous n'avez pas envoyé vos fichiers, écrivez-nous à la même adresse pour être remboursé en entier.
