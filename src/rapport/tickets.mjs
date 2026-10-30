// Export des lots et constats en CSV importable (Jira, GitLab, Azure DevOps, Linear) : une ligne par ticket.
import { AXES } from '../index.mjs';

const champ = (v) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const PRIO = { P1: 'Highest', P2: 'High', P3: 'Medium', P4: 'Low' };

export function ticketsCsv(a) {
  const lignes = [['Summary', 'Description', 'Priority', 'Labels', 'Original Estimate (days)', 'Max Estimate (days)']];
  for (const l of a.estimation.lots) {
    lignes.push([`[Migration] ${l.titre.replace(/`/g, '')}`, `Base de calcul : ${l.base}`, 'Medium', 'audit-angular migration', l.bas, l.haut]);
  }
  for (const f of a.findings) {
    const ou = f.emplacements.slice(0, 10).map((p) => `${p.fichier}${p.ligne ? `:${p.ligne}` : ''}`).join(', ');
    lignes.push([`[${f.id}] ${f.title}`, `${f.detail}\nAction : ${f.recommandation}${ou ? `\nEmplacements : ${ou}` : ''}`, PRIO[f.severity], `audit-angular ${f.axe}`, '', '']);
  }
  return '﻿' + lignes.map((l) => l.map(champ).join(',')).join('\r\n') + '\r\n';
}
export { AXES };
