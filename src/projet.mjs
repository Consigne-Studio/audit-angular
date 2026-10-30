// Faits au niveau du projet : versions réellement installées (lockfile), configuration Angular, TypeScript, outillage.
import { jsonSouple, lireTexte, taille } from './collecte.mjs';

const nettoyerVersion = (v) => (typeof v === 'string' ? (v.match(/\d+(\.\d+){0,2}/)?.[0] ?? null) : null);
export const majeure = (v) => (v ? Number(String(v).split('.')[0]) : null);

/** Versions résolues depuis package-lock.json (v1, v2, v3), yarn.lock ou pnpm-lock.yaml ; sinon la plage de package.json. */
async function versionsResolues(racine, fichiers, noms) {
  const res = {};
  if (fichiers.includes('package-lock.json')) {
    const lock = jsonSouple(await lireTexte(racine, 'package-lock.json'));
    for (const n of noms) {
      const v = lock?.packages?.[`node_modules/${n}`]?.version ?? lock?.dependencies?.[n]?.version;
      if (v) res[n] = v;
    }
    return { res, source: 'package-lock.json' };
  }
  if (fichiers.includes('bun.lock')) {
    const lock = jsonSouple(await lireTexte(racine, 'bun.lock'));
    for (const n of noms) {
      const e = lock?.packages?.[n]?.[0];
      if (typeof e === 'string') res[n] = e.slice(e.lastIndexOf('@') + 1);
    }
    return { res, source: 'bun.lock' };
  }
  if (fichiers.includes('yarn.lock')) {
    const t = await lireTexte(racine, 'yarn.lock');
    for (const n of noms) {
      const esc = n.replace(/[/.@-]/g, (c) => `\\${c}`);
      const m = t.match(new RegExp(`^"?${esc}@[^\\n]*\\n\\s+version:?\\s+"?([0-9][^"\\n]*)`, 'm'));
      if (m) res[n] = m[1];
    }
    return { res, source: 'yarn.lock' };
  }
  if (fichiers.includes('pnpm-lock.yaml')) {
    const t = await lireTexte(racine, 'pnpm-lock.yaml');
    for (const n of noms) {
      const esc = n.replace(/[/.@-]/g, (c) => `\\${c}`);
      const m = t.match(new RegExp(`\\n\\s+'?${esc}'?:\\s*\\n\\s+specifier:[^\\n]*\\n\\s+version:\\s*([0-9][^\\s(]*)`));
      if (m) res[n] = m[1];
    }
    return { res, source: 'pnpm-lock.yaml' };
  }
  return { res, source: null };
}

export async function lireProjet(racine, fichiers) {
  const pkg = jsonSouple(await lireTexte(racine, 'package.json').catch(() => null));
  if (!pkg) throw new Error(`Aucun package.json lisible à la racine de ${racine}`);
  const deps = { ...(pkg.dependencies ?? {}) };
  const devDeps = { ...(pkg.devDependencies ?? {}) };
  const tous = { ...devDeps, ...deps };
  const { res: resolues, source: sourceVersions } = await versionsResolues(racine, fichiers, Object.keys(tous));
  const dependances = Object.entries(tous)
    .map(([name, plage]) => ({ name, version: resolues[name] ?? nettoyerVersion(plage), plage, dev: !(name in deps) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const v = (n) => dependances.find((d) => d.name === n)?.version ?? null;

  const angularJson = jsonSouple(fichiers.includes('angular.json') ? await lireTexte(racine, 'angular.json') : null);
  const projets = Object.entries(angularJson?.projects ?? {});
  const app = projets.find(([, p]) => p.projectType === 'application') ?? projets[0];
  const build = app?.[1]?.architect?.build ?? app?.[1]?.targets?.build;
  const test = app?.[1]?.architect?.test ?? app?.[1]?.targets?.test;
  const prod = build?.configurations?.production ?? {};
  const optionsBuild = build?.options ?? {};

  // tsconfig : on suit un niveau d'« extends » local.
  const tsconf = async (rel) => {
    if (!fichiers.includes(rel)) return null;
    const j = jsonSouple(await lireTexte(racine, rel));
    return j;
  };
  const tsRacine = (await tsconf('tsconfig.json')) ?? {};
  const tsApp = (await tsconf('tsconfig.app.json')) ?? (await tsconf('src/tsconfig.app.json')) ?? {};
  const co = { ...(tsRacine.compilerOptions ?? {}), ...(tsApp.compilerOptions ?? {}) };
  const aco = { ...(tsRacine.angularCompilerOptions ?? {}), ...(tsApp.angularCompilerOptions ?? {}) };

  const a = (re) => fichiers.filter((f) => re.test(f));
  const assetsLourds = [];
  for (const f of a(/(^|\/)(src\/)?(assets|public)\/.*\.(png|jpe?g|gif|webp|svg|mp4|webm|woff2?|ttf|json)$/i)) {
    const t = await taille(racine, f);
    if (t > 500_000) assetsLourds.push({ fichier: f, ko: Math.round(t / 1024) });
  }

  return {
    nom: pkg.name ?? null,
    dependances,
    sourceVersions,
    angular: { version: v('@angular/core'), major: majeure(v('@angular/core')) },
    versions: {
      typescript: v('typescript'), rxjs: v('rxjs'), zonejs: v('zone.js'), node: pkg.engines?.node ?? null,
    },
    angularJson: !!angularJson,
    builder: build?.builder ?? null,
    testBuilder: test?.builder ?? null,
    budgets: (prod.budgets ?? optionsBuild.budgets ?? []).map((b) => b.type),
    prod: {
      sourceMap: prod.sourceMap ?? optionsBuild.sourceMap ?? null,
      optimization: prod.optimization ?? optionsBuild.optimization ?? null,
    },
    polyfillsZone: JSON.stringify(optionsBuild.polyfills ?? '').includes('zone.js') || fichiers.some((f) => /polyfills\.ts$/.test(f)),
    tsconfig: {
      strict: co.strict === true,
      noImplicitAny: co.noImplicitAny ?? (co.strict === true ? true : false),
      strictTemplates: aco.strictTemplates === true,
      strictInjectionParameters: aco.strictInjectionParameters === true,
    },
    outillage: {
      eslint: a(/(^|\/)(\.eslintrc(\.\w+)?|eslint\.config\.\w+)$/).length > 0 || 'eslint' in tous,
      tslint: fichiers.includes('tslint.json') || 'tslint' in tous,
      prettier: a(/(^|\/)\.prettierrc/).length > 0 || 'prettier' in tous,
      ci: a(/^\.github\/workflows\/|^Jenkinsfile$|^\.gitlab-ci\.yml$|^azure-pipelines\.ya?ml$|^\.circleci\//).map((f) => f.split('/').slice(0, 2).join('/')).filter((x, i, t) => t.indexOf(x) === i),
      sonar: fichiers.includes('sonar-project.properties'),
      protractor: a(/protractor\.conf\.(js|ts)$/).length > 0 || 'protractor' in tous,
      playwright: a(/playwright\.config\.(ts|js|mjs)$/).length > 0 || '@playwright/test' in tous,
      cypress: a(/cypress\.config\.(ts|js)$/).length > 0 || 'cypress' in tous,
      karma: a(/karma\.conf\.(js|ts)$/).length > 0 || 'karma' in tous,
      vitest: a(/vitest\.config\.\w+$/).length > 0 || 'vitest' in tous,
      jest: a(/jest\.config\.\w+$/).length > 0 || 'jest' in tous,
    },
    e2eSpecs: a(/(^|\/)e2e\/.*\.(e2e-)?spec\.ts$|\.e2e-spec\.ts$|(^|\/)(e2e|tests)\/.*\.spec\.ts$/).length,
    assetsLourds,
  };
}
