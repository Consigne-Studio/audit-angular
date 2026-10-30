// Analyse des gabarits HTML Angular (fichiers .html ou gabarits en ligne) par expressions régulières.
// Suffisant pour compter ; on ne prétend pas valider la syntaxe.

const lignesDe = (texte, re) => {
  const res = [];
  for (const m of texte.matchAll(re)) res.push(texte.slice(0, m.index).split('\n').length);
  return res;
};

export function analyserGabarit(rel, texte, decalage = 0) {
  const L = (re) => lignesDe(texte, re).map((l) => l + decalage);
  const ngFor = L(/\*ngFor\s*=\s*"[^"]*"/g);
  const ngForSansTrack = [...texte.matchAll(/\*ngFor\s*=\s*"([^"]*)"/g)]
    .filter((m) => !/trackBy/.test(m[1]))
    .map((m) => texte.slice(0, m.index).split('\n').length + decalage);
  // Appels de fonction dans une interpolation : {{ total() }} est normal pour un signal, on ne compte que les appels avec argument.
  const appels = L(/\{\{[^}]*?\b[a-zA-Z_$][\w$]*\([^)\s][^)]*\)[^}]*\}\}/g);
  return {
    fichier: rel,
    ancienControle: {
      ngIf: L(/\*ngIf\b/g).length,
      ngFor: ngFor.length,
      ngSwitch: L(/\[ngSwitch\]|\*ngSwitchCase|\*ngSwitchDefault/g).length,
    },
    nouveauControle: {
      if: L(/@if\s*\(/g).length,
      for: L(/@for\s*\(/g).length,
      switch: L(/@switch\s*\(/g).length,
      defer: L(/@defer\b/g).length,
    },
    ngClassStyle: L(/\[ngClass\]|\[ngStyle\]/g).length,
    ngForSansTrack,
    innerHtml: L(/\[innerHTML\]|\[outerHTML\]/g),
    appelsDansInterpolation: appels,
    pipeAsync: L(/\|\s*async\b/g).length,
    lignes: texte.split('\n').length,
  };
}
