// Markdown minimal pour la revue de l'expert : titres ###, paragraphes, listes, gras, italique, code, liens.
const echap = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const html = echap;

export function enLigne(s) {
  return echap(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function versHtml(md) {
  const out = [];
  let liste = null;
  let para = [];
  const fermer = () => {
    if (para.length) { out.push(`<p>${enLigne(para.join(' '))}</p>`); para = []; }
    if (liste) { out.push(`</${liste}>`); liste = null; }
  };
  for (const brut of md.split('\n')) {
    const l = brut.trimEnd();
    let m;
    if (!l.trim()) { fermer(); continue; }
    if ((m = l.match(/^(#{3,4})\s+(.*)$/))) { fermer(); out.push(`<h${m[1].length + 1}>${enLigne(m[2])}</h${m[1].length + 1}>`); continue; }
    if ((m = l.match(/^\s*[-*]\s+(.*)$/)) || (m = l.match(/^\s*\d+[.)]\s+(.*)$/))) {
      const type = /^\s*\d/.test(l) ? 'ol' : 'ul';
      if (para.length) { out.push(`<p>${enLigne(para.join(' '))}</p>`); para = []; }
      if (liste !== type) { if (liste) out.push(`</${liste}>`); out.push(`<${type}>`); liste = type; }
      out.push(`<li>${enLigne(m[1])}</li>`);
      continue;
    }
    if (liste) { out.push(`</${liste}>`); liste = null; }
    para.push(l.trim());
  }
  fermer();
  return out.join('\n');
}

/** Découpe la revue de l'expert (modele/revue.md) en sections ## et remarques par constat. */
export function lireRevue(md) {
  const sections = {};
  let cle = null;
  for (const l of md.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const m = l.match(/^##\s+(.+?)\s*$/);
    if (m) { cle = m[1].toLowerCase(); sections[cle] = []; continue; }
    if (cle) sections[cle].push(l);
  }
  const txt = (k) => (sections[k] ?? []).join('\n').trim();
  const remarques = {};
  for (const l of txt('remarques par constat').split('\n')) {
    const m = l.match(/^\s*[-*]\s+([A-Z]{3}-[\w-]+)\s*:\s*(.+)$/);
    if (m) remarques[m[1]] = m[2];
  }
  return {
    client: txt('client') || null,
    synthese: txt('synthèse') || txt('synthese') || null,
    plan: txt("plan d'action") || null,
    remarques,
    estimation: txt("ajustement de l'estimation") || null,
    auteur: txt('auteur') || null,
  };
}
