// Parcours du dépôt en lecture seule : on ne lit que des fichiers texte, on n'exécute rien.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const IGNORES = new Set(['node_modules', '.git', 'dist', '.angular', 'coverage', '.nx', 'tmp', 'out-tsc', '.cache', 'bazel-out']);
const TAILLE_MAX_TEXTE = 2_000_000; // au-delà, on considère le fichier comme généré

/** Liste récursive des fichiers, chemins relatifs à `racine`, séparateur « / ». */
export async function listerFichiers(racine) {
  const res = [];
  async function visiter(dir) {
    let entrees;
    try { entrees = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entrees) {
      if (e.isSymbolicLink()) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORES.has(e.name)) await visiter(abs);
      } else if (e.isFile()) {
        res.push(path.relative(racine, abs).split(path.sep).join('/'));
      }
    }
  }
  await visiter(racine);
  return res.sort();
}

export async function lireTexte(racine, rel) {
  const abs = path.join(racine, rel);
  const s = await stat(abs);
  if (s.size > TAILLE_MAX_TEXTE) return null;
  return readFile(abs, 'utf8');
}

export async function taille(racine, rel) {
  return (await stat(path.join(racine, rel))).size;
}

/** Lit un JSON qui peut contenir des commentaires (tsconfig, angular.json). */
export function jsonSouple(texte) {
  if (texte == null) return null;
  try { return JSON.parse(texte); } catch { /* commentaires ou virgules finales */ }
  const sansCommentaires = texte
    .replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, chaine) => chaine ?? '')
    .replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(sansCommentaires); } catch { return null; }
}
