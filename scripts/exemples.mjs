// Régénère le rapport d'exemple public sur ngx-admin (MIT, akveo), à un commit fixé.
// Usage : node scripts/exemples.mjs [dossier ngx-admin déjà cloné]
// mesures/npm-audit.json : `npm audit --json --package-lock-only` lancé le 2026-10-23 sur ce commit.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = 'dc6a442704bfef34b776b5eb15faf852d9e2f75c'; // master du 2024-09-25
const DATE = '2026-10-23';
const racine = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let src = process.argv[2];
if (!src) {
  src = path.join(tmpdir(), 'ngx-admin-exemple');
  if (!existsSync(src)) execFileSync('git', ['clone', '--quiet', 'https://github.com/akveo/ngx-admin.git', src], { stdio: 'inherit' });
  execFileSync('git', ['-C', src, 'checkout', '--quiet', COMMIT], { stdio: 'inherit' });
}
const sortie = path.join(racine, 'exemples', 'ngx-admin');
execFileSync(process.execPath, [path.join(racine, 'bin', 'audit-angular.mjs'), src, '-o', sortie, '--date', DATE, '--revue', path.join(sortie, 'revue.md'), '--pdf', '--tickets', '--complements', path.join(sortie, 'mesures')], { stdio: 'inherit' });
