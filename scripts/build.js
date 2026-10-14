#!/usr/bin/env node
/*
 * Multi Medica Varese – generatore del sito statico (Node >= 16, nessuna dipendenza).
 * Uso:   node scripts/build.js
 * Legge: data/*.json
 * Scrive: index.html, medici.html, convenzioni.html, dove-siamo.html, ozonoterapia.html, privacy.html,
 *         ambulatori/*.html, diagnostica/*.html, sitemap.xml, robots.txt
 * Il sito generato è HTML statico: funziona senza build e senza server applicativo.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const load = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n + '.json'), 'utf8'));
const site = load('site');
const ambulatori = load('ambulatori');
const diagnostica = load('diagnostica');
const convenzioni = load('convenzioni');
const medici = load('medici');

/* ------------------------------------------------------------------ utilità */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const written = [];

/* meta description: massimo 160 caratteri; aggiunge i pezzi opzionali solo se ci stanno */
function fit(base, ...optional) {
  let out = base;
  for (const o of optional) if (o && (out + ' ' + o).length <= 160) out += ' ' + o;
  if (out.length > 160) out = out.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  return out;
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  written.push(rel);
}

const ICONS = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  ext: '<path d="M14 3h7v7M10 14 21 3M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h8"/>',
};
function icon(name, size = 24) {
  const attrs = `class="i" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
  if (name === 'cross') return `<svg ${attrs} fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>`;
  return `<svg ${attrs} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

const PHOTOS = {
  reception: ["Reception di Multi Medica Varese con l'insegna sulla parete", 'reception'],
  'sala-attesa': ["Sala d'attesa del poliambulatorio", 'sala-attesa'],
  'studio-odontoiatrico': ['Studio odontoiatrico', 'studio-odontoiatrico'],
  'studio-oculistico': ['Studio oculistico con la strumentazione', 'studio-oculistico'],
  'studio-ecografia': ['Sala per ecografie con lettino e ecografo', 'studio-ecografia'],
  cardio: ['Stetoscopio appoggiato su un tracciato elettrocardiografico', 'cardio'],
  dermatologo: ['Controllo dermatologico con dermatoscopio', 'dermatologo'],
  oculista: ['Occhiali davanti a una tabella per il controllo della vista', 'oculista'],
  eco: ['Sonda ecografica impugnata con guanto', 'eco'],
  esami: ["Provette per esami di laboratorio", 'esami'],
};
function photo(key, root, { eager = false, cls = '' } = {}) {
  const p = PHOTOS[key];
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<figure class="photo ${cls}"><img src="${root}assets/img/foto/${p[1]}.webp" width="800" height="400" alt="${esc(p[0])}" ${loading}></figure>`;
}

/* dimensioni reali dei loghi delle convenzioni (px) */
const LOGO_DIM = { immag1001: [200, 98], immag1005: [200, 63], immag1006: [200, 82], immag1007: [200, 59], immag1009: [200, 75], immag1011: [200, 59], immag1014: [200, 62], immag1015: [200, 70] };
function logoImg(c, root, alt) {
  const base = c.logo.replace(/\.\w+$/, '');
  const [w, h] = LOGO_DIM[base];
  return `<img src="${root}assets/img/convenzioni/${base}.webp" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
}

const tel = site.telefono;
const telHref = `tel:${site.telefonoHref}`;
const addrLine = `${site.indirizzo.via} - ${site.indirizzo.cap} ${site.indirizzo.citta}`;
const slugAmb = (a) => `ambulatori/${a.slug}.html`;
const slugDiag = (d) => `diagnostica/${d.slug}.html`;
const ambBySlug = Object.fromEntries(ambulatori.map((a) => [a.slug, a]));
const diagBySlug = Object.fromEntries(diagnostica.map((d) => [d.slug, d]));
const docName = (d) => `${d.titolo} ${d.nome}`;

const NAV = [
  { key: 'ambulatori', label: 'Ambulatori', href: 'ambulatori/index.html' },
  { key: 'medici', label: 'Medici', href: 'medici.html' },
  { key: 'diagnostica', label: 'Diagnostica', href: 'diagnostica/index.html' },
  { key: 'convenzioni', label: 'Convenzioni', href: 'convenzioni.html' },
  { key: 'dove-siamo', label: 'Dove siamo', href: 'dove-siamo.html' },
];

/* ------------------------------------------------------------------ layout */
function clinicJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['MedicalClinic', 'LocalBusiness'],
    name: site.ragioneSociale,
    alternateName: site.nome,
    description: `${site.tipo} nel centro di Varese.`,
    url: site.baseUrl + '/',
    logo: `${site.baseUrl}/assets/img/logo.png`,
    image: `${site.baseUrl}/assets/img/og-image.jpg`,
    telephone: `+39 ${site.telefono}`,
    email: site.email,
    vatID: `IT${site.piva}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.indirizzo.via,
      postalCode: site.indirizzo.cap,
      addressLocality: site.indirizzo.citta,
      addressRegion: site.indirizzo.provincia,
      addressCountry: site.indirizzo.paese,
    },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: site.orari.apertura,
      closes: site.orari.chiusura,
    }],
    hasMap: site.mapsUrl,
  };
}

function breadcrumbJsonLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: `${site.baseUrl}/${c.href}`,
    })),
  };
}

function breadcrumbHtml(crumbs, root) {
  const items = crumbs.map((c, i) => {
    const last = i === crumbs.length - 1;
    return last
      ? `<li><span aria-current="page">${esc(c.label)}</span></li>`
      : `<li><a href="${root}${c.href}">${esc(c.label)}</a></li>`;
  });
  return `<nav class="breadcrumb" aria-label="Percorso di navigazione"><div class="wrap"><ol>${items.join('')}</ol></div></nav>`;
}

function header(root, activeKey, file) {
  const links = NAV.map((n) => {
    const exact = file === n.href;
    const attr = exact ? ' aria-current="page"' : activeKey === n.key ? ' class="is-active"' : '';
    return `<li><a href="${root}${n.href}"${attr}>${esc(n.label)}</a></li>`;
  }).join('');
  return `<a class="skip-link" href="#contenuto">Al contenuto principale</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${root}index.html" aria-label="Multi Medica Varese – pagina iniziale">
      <img src="${root}assets/img/logo.png" width="400" height="71" alt="Multi Medica Varese">
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="menu"><span class="nav-toggle-bars" aria-hidden="true"></span><span>Menu</span></button>
    <nav id="menu" class="site-nav" aria-label="Principale"><ul>${links}</ul></nav>
    <a class="btn btn-call header-call" href="${telHref}">${icon('phone', 20)}Chiama ${tel}</a>
  </div>
</header>`;
}

function footer(root) {
  const legal = `MULTI MEDICA VARESE Srl - Via Piave, 9 - 21100 Varese - Tel <a href="${telHref}">${tel}</a> - Dir. Sanitario ${esc(site.direttoreSanitario)} - P.IVA ${site.piva} - Iscriz. ${esc(site.tribunale)} - <a href="mailto:${site.email}">${site.email}</a>`;
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="${root}assets/img/logo.png" width="400" height="71" alt="Multi Medica Varese" loading="lazy">
        <p><strong>${esc(site.ragioneSociale)}</strong><br>${esc(site.tipo)}</p>
        <p>${esc(site.indirizzo.via)}<br>${site.indirizzo.cap} ${site.indirizzo.citta}</p>
      </div>
      <nav aria-label="Pagine del sito">
        <h2>Il sito</h2>
        <ul>
          ${NAV.map((n) => `<li><a href="${root}${n.href}">${esc(n.label)}</a></li>`).join('\n          ')}
          <li><a href="${root}ozonoterapia.html">Ozonoterapia</a></li>
        </ul>
      </nav>
      <div>
        <h2>Contatti</h2>
        <ul>
          <li><a href="${telHref}">Telefono ${tel}</a></li>
          <li><a href="mailto:${site.email}">${site.email}</a></li>
          <li>PEC: <a href="mailto:${site.pec}">${site.pec}</a></li>
          <li>${esc(site.orari.titolo)}, ${esc(site.orari.giorni)} ${esc(site.orari.fascia)}</li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <p>${legal}</p>
      <ul class="footer-links"><li><a href="${root}privacy.html">Informativa sulla privacy</a></li><li>Questo sito non utilizza cookie</li></ul>
      <p class="footer-proposal">Proposta di sito realizzata da <a href="${site.tramontis}" target="_blank" rel="noopener" aria-label="Tramontis (si apre in una nuova scheda)">Tramontis</a></p>
    </div>
  </div>
</footer>
<a class="call-bar" href="${telHref}">${icon('phone', 24)}Chiama ${tel}</a>`;
}

function page({ file, title, description: rawDescription, main, activeKey = '', jsonld = [], comment = '' }) {
  const description = fit(rawDescription);
  const depth = file.split('/').length - 1;
  const root = '../'.repeat(depth);
  const url = `${site.baseUrl}/${file === 'index.html' ? '' : file}`;
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  sitemapUrls.push(file === 'index.html' ? '' : file);
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${site.proposta ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'}
<meta name="theme-color" content="#286b82">
${site.proposta ? '' : `<link rel="canonical" href="${url}">`}
<link rel="icon" type="image/svg+xml" href="${root}assets/img/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="${root}assets/img/favicon-32.png">
<link rel="icon" type="image/x-icon" href="${root}assets/img/favicon.ico" sizes="16x16">
<link rel="apple-touch-icon" href="${root}assets/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="it_IT">
<meta property="og:site_name" content="${esc(site.nome)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.baseUrl}/assets/img/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="${root}assets/fonts/atkinson-hyperlegible-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}assets/fonts/atkinson-hyperlegible-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/css/style.css">
<script src="${root}assets/js/main.js"></script>
${ld}
</head>
<body>
${comment ? `<!-- ${comment} -->\n` : ''}${header(root, activeKey, file)}
${main(root)}
${footer(root)}
</body>
</html>
`;
}
const sitemapUrls = [];

/* ------------------------------------------------------------------ componenti */
function contactBlock() {
  return `<ul class="contact-list">
    <li><span class="ico">${icon('phone')}</span><div><strong>Telefono</strong><a href="${telHref}">${tel}</a></div></li>
    <li><span class="ico">${icon('mail')}</span><div><strong>Email</strong><a href="mailto:${site.email}">${site.email}</a></div></li>
    <li><span class="ico">${icon('pin')}</span><div><strong>Indirizzo</strong><span class="v">${esc(site.indirizzo.via)}, ${site.indirizzo.cap} ${site.indirizzo.citta}</span><br><a href="${esc(site.mapsUrl)}" target="_blank" rel="noopener" aria-label="Mappa su Google Maps (si apre in una nuova scheda)">Mappa su Google Maps</a></div></li>
  </ul>`;
}
function hoursBox(h = 'h2') {
  return `<div class="hours">
    <${h}>Orari</${h}>
    <p class="t1">${esc(site.orari.titolo)}</p>
    <p class="t2">${esc(site.orari.giorni)}<br>${esc(site.orari.fascia)}</p>
  </div>`;
}
function asideContacts() {
  return `<aside aria-label="Contatti e orari">
    <div class="panel"><h2>Per appuntamenti</h2>${contactBlock()}<div class="btn-row"><a class="btn btn-call" href="${telHref}">${icon('phone', 20)}Chiama ${tel}</a></div></div>
    ${hoursBox('h2')}
  </aside>`;
}
function actionButtons() {
  return `<div class="btn-row"><a class="btn btn-call" href="${telHref}">${icon('phone', 20)}Chiama ${tel}</a><a class="btn btn-ghost" href="mailto:${site.email}">${icon('mail', 20)}Email alla segreteria</a></div>`;
}
function filterBox({ id, listId, label, noun, nounOne, total }) {
  return `<div class="filter">
    <label for="${id}">${esc(label)}</label>
    <input id="${id}" type="search" autocomplete="off" data-filter="#${listId}" data-noun="${noun}" data-noun-one="${nounOne}" aria-describedby="${id}-status">
    <p class="filter-status" id="${id}-status" role="status" aria-live="polite">${total} ${noun}</p>
  </div>`;
}
function row(href, nome, meta, search) {
  return `<li data-filter-item data-search="${esc(search)}"><a href="${href}"><span class="row-name">${esc(nome)}</span><span class="row-meta">${esc(meta)}</span></a></li>`;
}
function ambCard(a, root) {
  const search = norm([a.nome, ...a.medici.map((m) => m.nome), ...a.prestazioni, ...(a.prestazioni_gruppi || []).flat()].join(' '));
  return row(`${root}${slugAmb(a)}`, a.nome, plural(a.medici.length, 'medico', 'medici'), search);
}
function diagCard(d, root) {
  const search = norm([d.nome, ...d.esami.map((e) => e.nome)].join(' '));
  return row(`${root}${slugDiag(d)}`, d.nome, plural(d.esami.length, 'esame', 'esami'), search);
}
function pageHero({ h1, lead, photoKey, root, actions = true }) {
  return `<section class="page-hero" aria-labelledby="titolo-pagina">
    <div class="wrap page-hero-grid${photoKey ? ' has-photo' : ''}">
      <div>
        <h1 id="titolo-pagina">${esc(h1)}</h1>
        ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
        ${actions ? actionButtons() : ''}
      </div>
      ${photoKey ? photo(photoKey, root, { eager: true }) : ''}
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ home */
function homePage() {
  const featured = convenzioni;
  return page({
    file: 'index.html',
    title: 'Multi Medica Varese | Poliambulatorio specialistico a Varese',
    description: 'Multi Medica Varese: poliambulatorio specialistico nel centro di Varese, in Via Piave 9. 24 ambulatori, diagnostica e convenzioni. Appuntamenti allo 0332 287257.',
    activeKey: '',
    jsonld: [clinicJsonLd()],
    main: (root) => `<main id="contenuto" tabindex="-1">
  <section class="hero" aria-labelledby="titolo-pagina">
    <div class="wrap hero-grid">
      <h1 id="titolo-pagina">Multi Medica Varese</h1>
      <div class="hero-info">
        <p class="lead">Poliambulatorio specialistico nel centro di Varese, in Via Piave 9.</p>
        <a class="phone" href="${telHref}">${icon('phone', 34)}<span class="visually-hidden">Chiama </span>${tel}</a>
        <p class="hours-line"><strong>${esc(site.orari.titolo)}</strong><br>${esc(site.orari.giorni)}, ${esc(site.orari.fascia)}</p>
      </div>
      ${photo('reception', root, { eager: true })}
    </div>
  </section>

  <section class="section" id="ambulatori" aria-labelledby="titolo-ambulatori">
    <div class="wrap">
      <div class="section-head">
        <h2 id="titolo-ambulatori">Ambulatori</h2>
        <p>${ambulatori.length} specialità. Scelga un ambulatorio per consultare le prestazioni eseguite e i medici.</p>
      </div>
      <ul class="index cols">${ambulatori.map((a) => ambCard(a, root)).join('')}</ul>
      <p style="margin-top:24px"><a class="textlink" href="${root}ambulatori/index.html">Cerca per medico o prestazione</a></p>
    </div>
  </section>

  <section class="section section-glass" id="diagnostica" aria-labelledby="titolo-diagnostica">
    <div class="wrap split">
      <div>
        <h2 id="titolo-diagnostica">Diagnostica</h2>
        <p class="lead">Esami e prestazioni diagnostiche eseguiti in sede, in ${diagnostica.length} aree.</p>
        <ul class="index">${diagnostica.map((d) => diagCard(d, root)).join('')}</ul>
      </div>
      <div class="stack">${photo('esami', root)}${photo('eco', root)}</div>
    </div>
  </section>

  <section class="section" aria-labelledby="chi-siamo">
    <div class="wrap split">
      <div>
        <h2 id="chi-siamo">Due parole su di noi</h2>
        ${site.chiSiamo.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <ul class="values" aria-label="Valori dichiarati">${site.valori.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>
      </div>
      ${photo('sala-attesa', root)}
    </div>
  </section>

  <section class="section section-glass" aria-labelledby="titolo-conv">
    <div class="wrap">
      <div class="section-head">
        <h2 id="titolo-conv">Convenzioni</h2>
        <p>${convenzioni.length} convenzioni con fondi sanitari e assicurazioni, in forma diretta o indiretta. Per sapere se la Sua è attiva, chiami la segreteria.</p>
      </div>
      <ul class="conv-strip">${convenzioni.map((c) => `<li><a class="conv-tile" href="${root}convenzioni.html#${c.slug}">${c.logo ? logoImg(c, root, c.nome) : esc(c.nome)}</a></li>`).join('')}</ul>
      <a class="textlink" href="${root}convenzioni.html">Elenco completo e modalità operative</a>
    </div>
  </section>

  <section class="section" aria-labelledby="titolo-dove">
    <div class="wrap split">
      <div>
        <h2 id="titolo-dove">Come raggiungerci</h2>
        <p>${esc(site.raggiungerci.intro)}</p>
        <ul class="bullets">${site.raggiungerci.punti.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <p><strong>${esc(site.indirizzo.via)}, ${site.indirizzo.cap} ${site.indirizzo.citta}</strong></p>
        <div class="btn-row"><a class="btn btn-primary" href="${root}dove-siamo.html">Dove siamo</a><a class="btn btn-ghost" href="${esc(site.mapsRouteUrl)}" target="_blank" rel="noopener" aria-label="Percorso su Google Maps (si apre in una nuova scheda)">${icon('pin', 20)}Percorso su Google Maps</a></div>
      </div>
      <div>
        <h2>Ozonoterapia</h2>
        <p>Informazioni sulla terapia con ozono, dalla sezione novità del poliambulatorio.</p>
        <a class="textlink" href="${root}ozonoterapia.html">Pagina dedicata all'ozonoterapia</a>
      </div>
    </div>
  </section>
</main>`,
  });
}

/* ------------------------------------------------------------------ ambulatori */
function ambulatoriIndex() {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Ambulatori', href: 'ambulatori/index.html' }];
  return page({
    file: 'ambulatori/index.html',
    title: 'Ambulatori specialistici a Varese | Multi Medica Varese',
    description: `I ${ambulatori.length} ambulatori di Multi Medica Varese, poliambulatorio specialistico in Via Piave 9 a Varese. Appuntamenti allo ${tel}.`,
    activeKey: 'ambulatori',
    jsonld: [breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: 'Ambulatori', lead: `${ambulatori.length} ambulatori specialistici nel centro di Varese. Scelga la specialità per consultare prestazioni e medici; per fissare un appuntamento chiami la segreteria.`, photoKey: 'studio-odontoiatrico', root })}
  <section class="section" aria-label="Elenco degli ambulatori">
    <div class="wrap">
      ${filterBox({ id: 'q-amb', listId: 'lista-ambulatori', label: 'Ricerca di un ambulatorio, di un medico o di una prestazione', noun: 'ambulatori', nounOne: 'ambulatorio', total: ambulatori.length })}
      <ul class="index cols" id="lista-ambulatori">${ambulatori.map((a) => ambCard(a, root)).join('')}</ul>
    </div>
  </section>
</main>`,
  });
}

function ambulatorioPage(a, i) {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Ambulatori', href: 'ambulatori/index.html' }, { label: a.nome, href: slugAmb(a) }];
  const prev = ambulatori[(i + ambulatori.length - 1) % ambulatori.length];
  const next = ambulatori[(i + 1) % ambulatori.length];
  const lead = a.descrizione || `Ambulatorio di ${a.nome} presso Multi Medica Varese. Per informazioni contatti la segreteria.`;
  const linkedDiag = a.diagnostiche.map((s) => diagBySlug[s]).filter(Boolean);
  const list = (arr, cols) => `<ul class="checklist${cols ? ' cols' : ''}">${arr.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
  let prestHtml;
  if (a.prestazioni_gruppi && a.prestazioni_gruppi.length) prestHtml = a.prestazioni_gruppi.map((g) => list(g, true)).join('');
  else if (a.prestazioni.length) prestHtml = list(a.prestazioni, a.prestazioni.length > 6);
  else prestHtml = `<p class="empty">Per informazioni contatti la segreteria: <a href="${telHref}">${tel}</a> · <a href="mailto:${site.email}">${site.email}</a></p>`;
  const docs = a.medici.map((m) => `<li class="doc"><h3>${esc(docName(m))}</h3>${m.qualifiche.length ? `<ul class="quals">${m.qualifiche.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}${m.prestazioni.length ? `<details><summary>Prestazioni del medico</summary><ul>${m.prestazioni.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></details>` : ''}</li>`).join('');
  const names = a.medici.map((m) => m.nome).join(', ');
  return page({
    file: slugAmb(a),
    title: `${a.nome} a Varese | Multi Medica Varese`,
    description: fit(`Ambulatorio di ${a.nome} a Varese, presso Multi Medica Varese in Via Piave 9.`, `Appuntamenti: ${tel}.`, names ? `Medici: ${names}.` : ''),
    activeKey: 'ambulatori',
    jsonld: [breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: a.nome, lead, photoKey: a.foto, root })}
  <div class="wrap layout">
    <div>
      <section class="panel" aria-labelledby="prestazioni"><h2 id="prestazioni">Prestazioni eseguite</h2>${prestHtml}</section>
      <section class="panel" aria-labelledby="medici"><h2 id="medici">${a.medici.length === 1 ? 'Il medico' : 'I medici'}</h2><ul class="docs">${docs}</ul></section>
      ${linkedDiag.length ? `<section class="panel" aria-labelledby="diag-collegata"><h2 id="diag-collegata">Diagnostica collegata</h2><ul class="chips">${linkedDiag.map((d) => `<li><a class="chip" href="${root}${slugDiag(d)}">${esc(d.nome)}</a></li>`).join('')}</ul></section>` : ''}
      <nav class="pager" aria-label="Altri ambulatori">
        <a class="prev" href="${root}${slugAmb(prev)}" rel="prev"><small>Ambulatorio precedente</small>${esc(prev.nome)}</a>
        <a class="next" href="${root}${slugAmb(next)}" rel="next"><small>Ambulatorio successivo</small>${esc(next.nome)}</a>
      </nav>
    </div>
    ${asideContacts()}
  </div>
</main>`,
  });
}

/* ------------------------------------------------------------------ diagnostica */
function diagnosticaIndex() {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Diagnostica', href: 'diagnostica/index.html' }];
  return page({
    file: 'diagnostica/index.html',
    title: 'Diagnostica a Varese | Multi Medica Varese',
    description: `Le ${diagnostica.length} aree di diagnostica di Multi Medica Varese, Via Piave 9 a Varese: esami, ecografie, color doppler e altro. Appuntamenti: ${tel}.`,
    activeKey: 'diagnostica',
    jsonld: [breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: 'Diagnostica', lead: `${diagnostica.length} aree di diagnostica. Scelga l'area per consultare gli esami eseguiti; per un appuntamento chiami la segreteria.`, photoKey: 'studio-ecografia', root })}
  <section class="section" aria-label="Elenco della diagnostica">
    <div class="wrap">
      <ul class="index cols" id="lista-diagnostica">${diagnostica.map((d) => diagCard(d, root)).join('')}</ul>
    </div>
  </section>
</main>`,
  });
}

function diagnosticaPage(d, i) {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Diagnostica', href: 'diagnostica/index.html' }, { label: d.nome, href: slugDiag(d) }];
  const prev = diagnostica[(i + diagnostica.length - 1) % diagnostica.length];
  const next = diagnostica[(i + 1) % diagnostica.length];
  const linked = d.ambulatori.map((s) => ambBySlug[s]).filter(Boolean);
  const exams = d.esami.length
    ? `<ul class="exam-list">${d.esami.map((e) => `<li><strong>${esc(e.nome)}</strong>${e.descrizione ? `<span>${esc(e.descrizione)}</span>` : ''}</li>`).join('')}</ul>`
    : `<p class="empty">Per informazioni contatti la segreteria: <a href="${telHref}">${tel}</a></p>`;
  return page({
    file: slugDiag(d),
    title: `Diagnostica: ${d.nome} a Varese | Multi Medica Varese`,
    description: fit(`Diagnostica ${d.nome} a Varese, presso Multi Medica Varese in Via Piave 9.`, `Appuntamenti: ${tel}.`, d.esami.length ? `Esami: ${d.esami.map((x) => x.nome).join(', ')}.` : ''),
    activeKey: 'diagnostica',
    jsonld: [breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: d.nome, lead: `Esami eseguiti in sede. Per informazioni e appuntamenti contatti la segreteria.`, photoKey: d.foto, root })}
  <div class="wrap layout">
    <div>
      <section class="panel" aria-labelledby="esami"><h2 id="esami">Esami eseguiti</h2>${exams}</section>
      ${linked.length ? `<section class="panel" aria-labelledby="amb-collegati"><h2 id="amb-collegati">Ambulatori collegati</h2><ul class="chips">${linked.map((a) => `<li><a class="chip" href="${root}${slugAmb(a)}">${esc(a.nome)}</a></li>`).join('')}</ul></section>` : ''}
      <nav class="pager" aria-label="Altre aree di diagnostica">
        <a class="prev" href="${root}${slugDiag(prev)}" rel="prev"><small>Precedente</small>${esc(prev.nome)}</a>
        <a class="next" href="${root}${slugDiag(next)}" rel="next"><small>Successiva</small>${esc(next.nome)}</a>
      </nav>
    </div>
    ${asideContacts()}
  </div>
</main>`,
  });
}

/* ------------------------------------------------------------------ medici */
function mediciPage() {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Medici', href: 'medici.html' }];
  const unique = new Set(medici.flatMap((s) => s.medici.map((m) => m.nome))).size;
  const items = medici.map((s) => {
    const search = norm([s.specialita, ...s.medici.map((m) => m.nome)].join(' '));
    return `<li data-filter-item data-search="${esc(search)}">
      <h2>${esc(s.specialita)}</h2>
      <div>
        <ul>${s.medici.map((m) => `<li><strong>${esc(docName(m))}</strong>${m.qualifiche.length ? `<span class="q">${esc(m.qualifiche.join(' · '))}</span>` : ''}</li>`).join('')}</ul>
        <a class="textlink" href="%ROOT%ambulatori/${s.ambulatorio}.html">Scheda dell'ambulatorio<span class="visually-hidden"> di ${esc(s.specialita)}</span></a>
      </div>
    </li>`;
  });
  return page({
    file: 'medici.html',
    title: 'Medici specialisti a Varese | Multi Medica Varese',
    description: `I medici specialisti di Multi Medica Varese, elenco per specialità: ${medici.length} ambulatori. Appuntamenti allo ${tel}.`,
    activeKey: 'medici',
    jsonld: [breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: 'Medici specialisti', lead: `Elenco dei medici per specialità (${unique} professionisti, alcuni presenti in più ambulatori). Selezioni la specialità per consultare prestazioni e contatti.`, root })}
  <section class="section" aria-label="Elenco dei medici per specialità">
    <div class="wrap">
      ${filterBox({ id: 'q-med', listId: 'lista-medici', label: 'Ricerca di un medico o di una specialità', noun: 'specialità', nounOne: 'specialità', total: medici.length })}
      <ul class="dir" id="lista-medici">${items.join('').split('%ROOT%').join(root)}</ul>
    </div>
  </section>
</main>`,
  });
}

/* ------------------------------------------------------------------ convenzioni */
function linkify(text) {
  return esc(text).replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1">$1</a>');
}
function convenzioniPage() {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Convenzioni', href: 'convenzioni.html' }];
  const cards = convenzioni.map((c, idx) => {
    const search = norm([c.nome, c.nome_esteso || '', ...c.tipo].join(' '));
    const logo = c.logo ? logoImg(c, '%ROOT%', 'Logo ' + c.nome) : `<span class="noimg">${icon('cross', 40)}</span>`;
    const hasDetails = c.aventi_diritto.length || c.modalita.length;
    const details = `<details class="more"><summary>Come fare?</summary>
        ${c.aventi_diritto.length ? `<h3>Hanno diritto alla convenzione</h3>${c.aventi_diritto.map((p) => `<p>${linkify(p)}</p>`).join('')}` : ''}
        ${c.modalita.length ? `<h3>Modalità operative</h3>${c.modalita.map((p) => `<p>${linkify(p)}</p>`).join('')}` : ''}
        ${hasDetails ? '' : `<p>Per informazioni contatti la segreteria: <a href="${telHref}">${tel}</a>.</p>`}
      </details>`;
    return `<li data-filter-item data-search="${esc(search)}"><article class="conv-card" id="${c.slug}">
      <div class="conv-logo">${logo}</div>
      <h2>${esc(c.nome)}</h2>
      ${c.nome_esteso ? `<p class="full">${esc(c.nome_esteso)}</p>` : ''}
      <ul class="tags" aria-label="Tipo di convenzione">${c.tipo.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}</ul>
      ${c.sito ? `<p class="site-link"><a href="${esc(c.sito)}" target="_blank" rel="noopener" aria-label="Sito di ${esc(c.nome)} (si apre in una nuova scheda)">Sito di ${esc(c.nome)} ${icon('ext', 16)}</a></p>` : ''}
      ${details}
    </article></li>`;
  });
  return page({
    file: 'convenzioni.html',
    title: 'Convenzioni con fondi sanitari e assicurazioni | Multi Medica Varese',
    description: `Le ${convenzioni.length} convenzioni di Multi Medica Varese con fondi sanitari e assicurazioni: tipo di convenzione e modalità operative. Informazioni: ${tel}.`,
    activeKey: 'convenzioni',
    jsonld: [breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: 'Convenzioni', lead: `${convenzioni.length} convenzioni, in forma diretta o indiretta. Per i dettagli e per verificare la Sua copertura contatti la segreteria.`, root })}
  <section class="section" aria-label="Elenco delle convenzioni">
    <div class="wrap">
      ${filterBox({ id: 'q-conv', listId: 'lista-convenzioni', label: 'Ricerca di una convenzione per nome o tipo', noun: 'convenzioni', nounOne: 'convenzione', total: convenzioni.length })}
      <ul class="conv-list" id="lista-convenzioni">${cards.join('').split('%ROOT%').join(root)}</ul>
    </div>
  </section>
</main>`,
  });
}

/* ------------------------------------------------------------------ pagine singole */
function ozonoPage() {
  const o = site.ozono;
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: o.titolo, href: 'ozonoterapia.html' }];
  return page({
    file: 'ozonoterapia.html',
    title: 'Ozonoterapia a Varese | Multi Medica Varese',
    description: `Informazioni sull'ozonoterapia presso Multi Medica Varese, Via Piave 9 a Varese. Per informazioni: ${tel}.`,
    jsonld: [breadcrumbJsonLd(crumbs)],
    comment: "TESTO CLINICO FEDELE ALL'ORIGINALE (it/include/news_dett.php?id=7): DA VALIDARE CON IL DIRETTORE SANITARIO PRIMA DELLA PUBBLICAZIONE",
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: o.titolo, lead: `Pubblicato il ${o.pubblicatoEsteso}`, root, actions: false })}
  <div class="wrap layout">
    <article class="panel prose">
      ${o.paragrafi.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
      <ul>${o.elenco.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <p class="notice">Per informazioni contatti la segreteria: <a href="${telHref}">${tel}</a> · <a href="mailto:${site.email}">${site.email}</a></p>
    </article>
    ${asideContacts()}
  </div>
</main>`,
  });
}

function doveSiamoPage() {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Dove siamo', href: 'dove-siamo.html' }];
  return page({
    file: 'dove-siamo.html',
    title: 'Dove siamo: Via Piave 9, Varese | Multi Medica Varese',
    description: `Multi Medica Varese si trova in Via Piave 9, 21100 Varese, vicino alle stazioni FF.SS./FNM, alle fermate delle autolinee e all'uscita autostradale. Tel ${tel}.`,
    activeKey: 'dove-siamo',
    jsonld: [clinicJsonLd(), breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: 'Dove siamo', lead: 'Poliambulatorio specialistico in una zona logisticamente ideale nel centro di Varese.', root, actions: false })}
  <div class="wrap layout single">
    <div class="split">
      <section class="panel" aria-labelledby="contatti"><h2 id="contatti">${esc(site.ragioneSociale)}</h2>
        <ul class="contact-list">
          <li><span class="ico">${icon('pin')}</span><div><strong>Indirizzo</strong><span class="v">${esc(site.tipo)}<br>${esc(site.indirizzo.via)}<br>${site.indirizzo.cap} - ${site.indirizzo.citta} - IT</span></div></li>
          <li><span class="ico">${icon('phone')}</span><div><strong>Telefono</strong><a href="${telHref}">${tel}</a><br><span class="muted">Fax: ${site.fax}</span></div></li>
          <li><span class="ico">${icon('mail')}</span><div><strong>Email</strong><a href="mailto:${site.email}">${site.email}</a></div></li>
          <li><span class="ico">${icon('doc')}</span><div><strong>PEC</strong><a href="mailto:${site.pec}">${site.pec}</a></div></li>
        </ul>
        <h3>Documentazione per medici</h3>
        <p>Email: <a href="mailto:${site.emailMedici}">${site.emailMedici}</a></p>
        <div class="btn-row"><a class="btn btn-call" href="${telHref}">${icon('phone', 20)}Chiama ${tel}</a></div>
      </section>
      <div>
        <section class="panel" aria-labelledby="raggiungerci"><h2 id="raggiungerci">Come raggiungerci</h2>
          <p>${esc(site.raggiungerci.intro)}</p>
          <ul>${site.raggiungerci.punti.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          <div class="btn-row">
            <a class="btn btn-primary" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener" aria-label="Mappa su Google Maps (si apre in una nuova scheda)">${icon('pin', 20)}Mappa su Google Maps</a>
            <a class="btn btn-ghost" href="${esc(site.mapsRouteUrl)}" target="_blank" rel="noopener" aria-label="Percorso su Google Maps (si apre in una nuova scheda)">Percorso su Google Maps</a>
          </div>
        </section>
        <div style="margin-top:20px">${hoursBox('h2')}</div>
      </div>
    </div>
  </div>
</main>`,
  });
}

function privacyPage() {
  const crumbs = [{ label: 'Home', href: 'index.html' }, { label: 'Privacy', href: 'privacy.html' }];
  return page({
    file: 'privacy.html',
    title: 'Informativa sulla privacy | Multi Medica Varese',
    description: 'Informativa sulla privacy del sito di Multi Medica Varese: nessun cookie, nessun tracciamento, nessun modulo di raccolta dati.',
    jsonld: [breadcrumbJsonLd(crumbs)],
    main: (root) => `${breadcrumbHtml(crumbs, root)}
<main id="contenuto" tabindex="-1">
  ${pageHero({ h1: 'Informativa sulla privacy', lead: 'Come questo sito tratta i dati personali dei visitatori (Regolamento UE 2016/679, «GDPR»).', root, actions: false })}
  <div class="wrap layout single">
    <article class="panel prose">
      <p class="notice">Informativa proposta insieme al sito: da verificare e completare con il titolare del trattamento prima della pubblicazione definitiva.</p>
      <h2>Titolare del trattamento</h2>
      <p>${esc(site.ragioneSociale)}, ${esc(site.indirizzo.via)}, ${site.indirizzo.cap} ${site.indirizzo.citta}. Email: <a href="mailto:${site.email}">${site.email}</a>. PEC: <a href="mailto:${site.pec}">${site.pec}</a>. Telefono: <a href="${telHref}">${tel}</a>.</p>
      <h2>Dati raccolti dal sito</h2>
      <p>Il sito è composto da pagine di sola consultazione. Non contiene moduli di raccolta dati, non richiede registrazione e non raccoglie dati personali dei visitatori.</p>
      <p>Il sito non utilizza cookie, né propri né di terze parti, e non utilizza strumenti di analisi statistica, pubblicità o profilazione. Per questo motivo non è presente alcun banner dei cookie.</p>
      <h2>Dati di navigazione</h2>
      <p>Come ogni sito web, il server che ospita le pagine può registrare nei propri log tecnici alcune informazioni necessarie al funzionamento e alla sicurezza del servizio (ad esempio indirizzo IP, data e ora, pagina richiesta). Il titolare non utilizza queste informazioni per identificare i visitatori.</p>
      <h2>Contatti tramite telefono ed email</h2>
      <p>I collegamenti «Chiama» ed «Email» aprono l'applicazione telefonica o il programma di posta del dispositivo dell'utente. I dati che l'utente sceglie di comunicare (ad esempio nome, recapito, richiesta) sono trattati dal titolare solo per rispondere alla richiesta o fissare un appuntamento, e conservati per il tempo necessario a tale finalità.</p>
      <h2>Collegamenti a siti esterni</h2>
      <p>Il sito contiene collegamenti a siti di terzi (ad esempio Google Maps e i siti dei fondi sanitari e delle assicurazioni convenzionate). Questi siti hanno proprie informative sulla privacy e propri cookie, sui quali il titolare non ha controllo.</p>
      <h2>Diritti dell'interessato</h2>
      <p>L'interessato può chiedere al titolare l'accesso ai propri dati, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e opporsi al trattamento (artt. 15-22 GDPR) scrivendo a <a href="mailto:${site.email}">${site.email}</a>. Ha inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener" aria-label="garanteprivacy.it (si apre in una nuova scheda)">garanteprivacy.it</a>).</p>
    </article>
  </div>
</main>`,
  });
}

/* ------------------------------------------------------------------ esecuzione */
function clean(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  for (const f of fs.readdirSync(full)) if (f.endsWith('.html')) fs.unlinkSync(path.join(full, f));
}
clean('ambulatori');
clean('diagnostica');

write('index.html', homePage());
write('ambulatori/index.html', ambulatoriIndex());
ambulatori.forEach((a, i) => write(slugAmb(a), ambulatorioPage(a, i)));
write('diagnostica/index.html', diagnosticaIndex());
diagnostica.forEach((d, i) => write(slugDiag(d), diagnosticaPage(d, i)));
write('medici.html', mediciPage());
write('convenzioni.html', convenzioniPage());
write('ozonoterapia.html', ozonoPage());
write('dove-siamo.html', doveSiamoPage());
write('privacy.html', privacyPage());

const sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(sitemapUrls)].map((u) => `  <url><loc>${site.baseUrl}/${u}</loc></url>`).join('\n')}\n</urlset>\n`;
write('sitemap.xml', sm);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.baseUrl}/sitemap.xml\n`);

console.log(`Generate ${written.length} file: ${ambulatori.length} ambulatori, ${diagnostica.length} diagnostica, ${convenzioni.length} convenzioni.`);
