// Analyse d'un fichier TypeScript par son arbre syntaxique (API du compilateur TypeScript).
// Rien n'est compilé ni exécuté : on relève des faits, avec leur ligne.
import ts from 'typescript';

const DECOS_ANCIENS = ['Input', 'Output', 'ViewChild', 'ViewChildren', 'ContentChild', 'ContentChildren', 'HostListener', 'HostBinding'];
const API_SIGNALS = ['signal', 'computed', 'effect', 'linkedSignal', 'resource', 'httpResource', 'rxResource', 'toSignal', 'input', 'output', 'model', 'viewChild', 'viewChildren', 'contentChild', 'contentChildren'];
const CONSOLE = new Set(['log', 'debug', 'info', 'warn', 'error', 'trace']);

/**
 * @param {string} rel chemin relatif
 * @param {string} texte contenu
 * @returns faits du fichier
 */
export function analyserTs(rel, texte) {
  const sf = ts.createSourceFile(rel, texte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const ligne = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const f = {
    fichier: rel,
    lignes: texte.split('\n').length,
    composants: [], // { nom, ligne, standalone, onPush, templateInline, templateUrl, lignesClasse }
    ngModules: [],
    directives: 0,
    pipes: 0,
    injectables: 0,
    decorateursAnciens: Object.fromEntries(DECOS_ANCIENS.map((d) => [d, 0])),
    apiSignals: Object.fromEntries(API_SIGNALS.map((d) => [d, 0])),
    injectCalls: 0,
    injectionsConstructeur: 0,
    ngZone: [],
    subscribe: 0,
    nettoyageAbonnements: 0, // takeUntilDestroyed, takeUntil, unsubscribe, DestroyRef
    any: [],
    tsIgnore: 0,
    console: [],
    securite: [], // { regle, ligne, detail }
    imports: [], // modules importés
    routes: { differees: 0, directes: 0 },
    templatesInline: [], // { texte, ligne }
    zoneless: false,
    provideZoneChange: false,
    standaloneBootstrap: false,
  };

  // Commentaires @ts-ignore / @ts-nocheck
  f.tsIgnore = (texte.match(/@ts-(ignore|nocheck)/g) || []).length;

  const nomAppel = (expr) => {
    if (ts.isIdentifier(expr)) return expr.text;
    if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
    return '';
  };

  function lireDecorateur(dec) {
    const e = dec.expression;
    if (!ts.isCallExpression(e)) return { nom: ts.isIdentifier(e) ? e.text : '', obj: null };
    const obj = e.arguments[0] && ts.isObjectLiteralExpression(e.arguments[0]) ? e.arguments[0] : null;
    return { nom: nomAppel(e.expression), obj };
  }
  const prop = (obj, nom) => obj?.properties.find((p) => ts.isPropertyAssignment(p) && p.name && p.name.getText(sf) === nom);

  function visiterClasse(cls) {
    const decos = ts.canHaveDecorators(cls) ? ts.getDecorators(cls) ?? [] : [];
    for (const d of decos) {
      const { nom, obj } = lireDecorateur(d);
      if (nom === 'Component') {
        const standaloneP = prop(obj, 'standalone');
        const cd = prop(obj, 'changeDetection');
        const tpl = prop(obj, 'template');
        const tplUrl = prop(obj, 'templateUrl');
        const c = {
          nom: cls.name?.text ?? '(anonyme)',
          ligne: ligne(cls),
          // null = non déclaré : la valeur par défaut dépend de la version d'Angular (true depuis la v19).
          standalone: standaloneP ? standaloneP.initializer.kind === ts.SyntaxKind.TrueKeyword : null,
          onPush: !!cd && /OnPush/.test(cd.initializer.getText(sf)),
          templateUrl: tplUrl && ts.isStringLiteralLike(tplUrl.initializer) ? tplUrl.initializer.text : null,
          lignesClasse: sf.getLineAndCharacterOfPosition(cls.end).line - sf.getLineAndCharacterOfPosition(cls.getStart(sf)).line + 1,
        };
        if (tpl && (ts.isStringLiteralLike(tpl.initializer) || ts.isTemplateExpression(tpl.initializer))) {
          f.templatesInline.push({ texte: tpl.initializer.getText(sf).slice(1, -1), ligne: ligne(tpl) });
        }
        f.composants.push(c);
      } else if (nom === 'NgModule') {
        const decl = prop(obj, 'declarations');
        const n = decl && ts.isArrayLiteralExpression(decl.initializer) ? decl.initializer.elements.length : 0;
        f.ngModules.push({ nom: cls.name?.text ?? '(anonyme)', ligne: ligne(cls), declarations: n });
      } else if (nom === 'Directive') f.directives++;
      else if (nom === 'Pipe') f.pipes++;
      else if (nom === 'Injectable') f.injectables++;
    }
    if (decos.length) {
      const ctor = cls.members.find(ts.isConstructorDeclaration);
      if (ctor) f.injectionsConstructeur += ctor.parameters.filter((p) => p.type || (ts.canHaveDecorators(p) && ts.getDecorators(p)?.length)).length;
    }
  }

  function visiter(n) {
    if (ts.isClassDeclaration(n)) visiterClasse(n);

    // Décorateurs de membres (@Input, @ViewChild…)
    if ((ts.isPropertyDeclaration(n) || ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n)) && ts.canHaveDecorators(n)) {
      for (const d of ts.getDecorators(n) ?? []) {
        const { nom } = lireDecorateur(d);
        if (nom in f.decorateursAnciens) f.decorateursAnciens[nom]++;
      }
    }

    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const m = n.moduleSpecifier.text;
      f.imports.push({ module: m, ligne: ligne(n), complet: !!n.importClause && !n.importClause.namedBindings?.elements && !!(n.importClause.name || n.importClause.namedBindings) });
      if (n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
        for (const el of n.importClause.namedBindings.elements) if (el.name.text === 'NgZone') f.ngZone.push(ligne(n));
      }
    }

    if (n.kind === ts.SyntaxKind.AnyKeyword) f.any.push(ligne(n));

    if (ts.isCallExpression(n)) {
      const nom = nomAppel(n.expression);
      const estMembre = ts.isPropertyAccessExpression(n.expression);
      if (!estMembre && nom in f.apiSignals) f.apiSignals[nom]++;
      // input.required(), viewChild.required()…
      if (estMembre && nom === 'required' && ts.isIdentifier(n.expression.expression) && n.expression.expression.text in f.apiSignals) f.apiSignals[n.expression.expression.text]++;
      if (!estMembre && nom === 'inject') f.injectCalls++;
      if (nom === 'subscribe') f.subscribe++;
      if (['takeUntilDestroyed', 'takeUntil', 'unsubscribe'].includes(nom)) f.nettoyageAbonnements++;
      if (nom === 'provideZonelessChangeDetection' || nom === 'provideExperimentalZonelessChangeDetection') f.zoneless = true;
      if (nom === 'provideZoneChangeDetection') f.provideZoneChange = true;
      if (nom === 'bootstrapApplication') f.standaloneBootstrap = true;
      if (estMembre && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'console' && CONSOLE.has(nom)) f.console.push(ligne(n));
      if (/^bypassSecurityTrust(Html|Script|Style|Url|ResourceUrl)$/.test(nom)) f.securite.push({ regle: 'bypass', ligne: ligne(n), detail: nom });
      if (!estMembre && nom === 'eval') f.securite.push({ regle: 'eval', ligne: ligne(n), detail: 'eval()' });
      if (estMembre && nom === 'write' && /document$/.test(n.expression.expression.getText(sf))) f.securite.push({ regle: 'document-write', ligne: ligne(n), detail: 'document.write()' });
      if (estMembre && nom === 'setItem' && /(localStorage|sessionStorage)$/.test(n.expression.expression.getText(sf))) {
        const cle = n.arguments[0];
        if (cle && /token|jwt|auth|password|secret/i.test(cle.getText(sf))) f.securite.push({ regle: 'jeton-stockage', ligne: ligne(n), detail: `${n.expression.expression.getText(sf)}.setItem(${cle.getText(sf).slice(0, 40)})` });
      }
    }
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Function') f.securite.push({ regle: 'eval', ligne: ligne(n), detail: 'new Function()' });

    // element.innerHTML = … / outerHTML / insertAdjacentHTML
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && /^(innerHTML|outerHTML)$/.test(n.left.name.text)) {
      f.securite.push({ regle: 'dom-html', ligne: ligne(n), detail: `affectation de ${n.left.name.text}` });
    }

    if (ts.isStringLiteralLike(n)) {
      const s = n.text;
      if (/^http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|www\.w3\.org)[a-z0-9.-]+/i.test(s)) f.securite.push({ regle: 'http-clair', ligne: ligne(n), detail: s.slice(0, 60) });
      if (/AIza[0-9A-Za-z_-]{35}/.test(s)) f.securite.push({ regle: 'cle-google', ligne: ligne(n), detail: 'clé d\'API Google (valeur masquée)' });
      else if (/AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{16,}|ghp_[0-9A-Za-z]{36}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN (RSA |EC )?PRIVATE KEY/.test(s)) {
        f.securite.push({ regle: 'secret', ligne: ligne(n), detail: 'chaîne ressemblant à une clé (valeur masquée)' });
      }
    }
    if (ts.isPropertyAssignment(n) && n.name && /^(apiKey|apiSecret|clientSecret|password|secret|token)$/i.test(n.name.getText(sf).replace(/['"]/g, '')) && ts.isStringLiteralLike(n.initializer) && n.initializer.text.length >= 12 && !/^\{\{|^<|^\$|your|xxx|change/i.test(n.initializer.text)) {
      f.securite.push({ regle: 'secret', ligne: ligne(n), detail: `${n.name.getText(sf)} en dur (valeur masquée)` });
    }

    // Routes : objets qui ont un « path » et un « component » / « loadChildren » / « loadComponent »
    if (ts.isObjectLiteralExpression(n)) {
      const noms = n.properties.map((p) => p.name?.getText(sf)).filter(Boolean);
      if (noms.includes('path')) {
        if (noms.includes('loadChildren') || noms.includes('loadComponent')) f.routes.differees++;
        else if (noms.includes('component')) f.routes.directes++;
      }
    }
    ts.forEachChild(n, visiter);
  }
  visiter(sf);
  return f;
}
