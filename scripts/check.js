#!/usr/bin/env node
/* Controlli di coerenza sul sito generato (nessuna dipendenza): node scripts/check.js */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith('.') || ['node_modules', 'orig', 'scripts', 'data'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(ROOT);
const htmls = files.filter((f) => f.endsWith('.html'));
let errors = 0;
const PROPOSTA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8')).proposta;
const err = (m) => { errors++; console.error('ERRORE:', m); };

const FOOTER_LEGAL = 'MULTI MEDICA VARESE Srl - Via Piave, 9 - 21100 Varese - Tel 0332 287257 - Dir. Sanitario Dr. Graziano Azzimonti - P.IVA 02127670129 - Iscriz. Tribunale di Varese n. 20120/93 - info@multimedicava.com';
const text = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
for (const f of htmls) {
  const rel = path.relative(ROOT, f);
  const h = fs.readFileSync(f, 'utf8');
  if ((h.match(/<h1[\s>]/g) || []).length !== 1) err(`${rel}: h1 != 1`);
  if (PROPOSTA && !h.includes('<meta name="robots" content="noindex, nofollow">')) err(`${rel}: manca noindex`);
  if (!PROPOSTA && h.includes('noindex')) err(`${rel}: noindex presente ma proposta=false`);
  if (!/<title>[^<]+<\/title>/.test(h) || !/<meta name="description" content="[^"]{20,}"/.test(h)) err(`${rel}: title/description`);
  if (!text(h).includes(FOOTER_LEGAL)) err(`${rel}: riga legale footer non esatta`);
  if (!h.includes('<p class="footer-proposal">Proposta di sito realizzata da <a href="https://tramontis.netlify.app/" target="_blank" rel="noopener"')) err(`${rel}: riga Tramontis`);
  // link e immagini relativi
  for (const m of h.matchAll(/(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(u)) continue;
    const target = path.resolve(path.dirname(f), u);
    if (!fs.existsSync(target)) err(`${rel}: risorsa mancante ${u}`);
  }
  for (const m of h.matchAll(/href="([^"]*)#([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:)/.test(m[1])) continue;
    const tf = m[1] ? path.resolve(path.dirname(f), m[1]) : f;
    if (fs.existsSync(tf) && !fs.readFileSync(tf, 'utf8').includes(`id="${m[2]}"`)) err(`${rel}: ancora mancante #${m[2]}`);
  }
  for (const m of h.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="/.test(m[0]) || !/\bwidth="/.test(m[0]) || !/\bheight="/.test(m[0])) err(`${rel}: img senza alt/width/height ${m[0].slice(0, 80)}`);
  }
  if (/<script[^>]+src="https?:/.test(h)) err(`${rel}: script esterno`);
}
const count = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.html') && n !== 'index.html').length;
const data = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n + '.json'), 'utf8'));
const exp = { ambulatori: 24, diagnostica: 9 };
for (const [d, n] of Object.entries(exp)) if (count(d) !== n) err(`${d}: attese ${n} pagine, trovate ${count(d)}`);
const conv = data('convenzioni');
if (conv.length !== 19) err('convenzioni != 19');
const convHtml = fs.readFileSync(path.join(ROOT, 'convenzioni.html'), 'utf8');
if ((convHtml.match(/class="conv-card"/g) || []).length !== 19) err('convenzioni.html: card != 19');
const nMed = data('medici').reduce((a, s) => a + s.medici.length, 0);
const medHtml = fs.readFileSync(path.join(ROOT, 'medici.html'), 'utf8');
const nMedHtml = (medHtml.match(/<strong>(Dott\.|Dott\.ssa|Prof\.) /g) || []).length;
if (nMed !== nMedHtml) err(`medici: dati ${nMed}, html ${nMedHtml}`);
console.log(`Pagine HTML: ${htmls.length}; ambulatori ${count('ambulatori')}; diagnostica ${count('diagnostica')}; convenzioni ${conv.length}; voci medico ${nMed}.`);
if (errors) { console.error(`${errors} errori`); process.exit(1); }
console.log('Tutti i controlli superati.');
