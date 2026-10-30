# Journal des versions

## 1.0.0 — 2026-10-23

* Première version publique.
* Analyse en lecture seule : versions (lockfile npm, yarn, pnpm, bun), calendrier de support Angular, dépendances à risque, préparation standalone / signals / contrôle de flux / sans zone.js, qualité (strict, lint, tests, CI), sécurité (bypassSecurityTrust, innerHTML, eval, jetons en localStorage, secrets, http), performance (constructeur, budgets, chargement différé, trackBy, fichiers lourds).
* 56 vérifications (43 règles et 13 dépendances surveillées), priorités P1 à P4, indices par axe et global.
* Estimation de migration vers Angular 22 en jours (fourchette basse / haute, base de calcul affichée).
* Rapports : audit.json (schéma publié), rapport.html autonome imprimable A4, rapport.md, rapport.pdf (option).
* Export `tickets.csv` (`--tickets`) pour Jira, GitLab ou Azure DevOps.
* Revue de l'auditeur intégrée au rapport (`--revue`), option `--sans-chemins`, `--seuil` pour la CI.
