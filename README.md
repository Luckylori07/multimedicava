# Multi Medica Varese – proposta di restyling

Sito statico (HTML + CSS + JS, nessun framework, nessuna dipendenza a runtime, nessun cookie/tracking) che ricrea
[multimedicava.com](https://www.multimedicava.com/it/) con struttura e contenuti dell'originale e un design moderno,
responsive e accessibile (testo base 18 px, contrasti WCAG AA, navigazione da tastiera).

> **Questa è una PROPOSTA**: ogni pagina contiene `<meta name="robots" content="noindex, nofollow">`.

## Struttura

```
index.html  medici.html  convenzioni.html  dove-siamo.html  ozonoterapia.html  privacy.html
ambulatori/index.html + 24 pagine      diagnostica/index.html + 9 pagine
assets/css/style.css   assets/js/main.js   assets/img/…
data/*.json            sorgente unica dei contenuti
scripts/build.js       genera tutte le pagine HTML dai JSON (Node ≥ 16, senza dipendenze)
scripts/check.js       controlli: link, immagini, h1, footer, conteggi
sitemap.xml  robots.txt  .nojekyll
```

Le pagine HTML generate sono **committate**: il sito funziona così com'è (anche aprendo i file o su qualunque hosting
statico) e i percorsi sono relativi, quindi può stare anche in una sottocartella.

## Modificare i contenuti

1. Modifica i file in `data/`:
   - `ambulatori.json` – descrizione, prestazioni, medici (titolo, nome, qualifiche, prestazioni) di ogni ambulatorio
   - `diagnostica.json` – esami e descrizioni
   - `medici.json` – elenco medici per specialità (pagina *Medici*)
   - `convenzioni.json` – nome, tipo, sito, logo, aventi diritto, modalità operative
   - `site.json` – contatti, orari, testi della home, "come raggiungerci", Ozonoterapia, `proposta`, `baseUrl`
2. Rigenera: `node scripts/build.js` e controlla: `node scripts/check.js`.
3. Commit di `data/` **e** dei file HTML generati.

Se una voce è vuota (descrizione, prestazioni) la pagina mostra "Per informazioni contatta la segreteria".

## Aggiungere o cambiare foto

- Metti l'originale in `assets/img/orig/` e la versione ottimizzata (WebP, **max 800 px di larghezza se l'originale è 800 px**: non ingrandire oltre la risoluzione naturale) in `assets/img/foto/`.
- Registra l'immagine in `PHOTOS` dentro `scripts/build.js` (testo alternativo incluso) e assegnala con il campo `foto` in `data/ambulatori.json` o `data/diagnostica.json`.
- Loghi convenzioni: file in `assets/img/convenzioni/` + `LOGO_DIM` in `build.js` + campo `logo` in `convenzioni.json`.

Le foto con persone presenti nell'originale (`multimedica_02`, `_06`, `_09`, `medici.jpg`) sono evidentemente da stock con
modelli e **non sono usate**; restano solo in `assets/img/orig/`.

## Pubblicare

- **GitHub Pages**: Settings → Pages → *Deploy from a branch* → `main` / root. `.nojekyll` è già presente.
- **Netlify / altro hosting statico**: pubblica la root del repo (nessun comando di build necessario).
- Dopo la pubblicazione imposta `baseUrl` in `data/site.json` all'URL reale e rigenera (serve a sitemap, Open Graph e JSON-LD).

## Da proposta a sito ufficiale

1. In `data/site.json`: `"proposta": false` (toglie `noindex, nofollow`, aggiunge `index, follow` e `canonical`) e `baseUrl` = dominio ufficiale.
2. Rimuovi la riga "Proposta di sito realizzata da Tramontis" (funzione `footer()` in `scripts/build.js`) e il controllo corrispondente in `scripts/check.js`.
3. Rimuovi dalla pagina Privacy l'avviso "Informativa proposta…" dopo la validazione del titolare ; `check.js` si adatta da solo a `proposta:false`.
4. `node scripts/build.js`, test, push; aggiorna `robots.txt`/`sitemap.xml` (rigenerati dal build).

## Correzioni rispetto al testo originale

Corretti solo refusi evidenti (nessun contenuto aggiunto): "Ecgrafia", "Tranfontanellare", "Ecografica", "Chirurdo",
"studioe cura", "Gastoenterologica", "Chirugia", "Universita’", "rimbosrso", "contattaci", "ElettroCardioGramma" →
"Elettrocardiogramma", "Medico Chirurgo" → "Medico chirurgo"; nomi con ordine invertito ("Azzimonti GRAZIANO" →
Graziano Azzimonti; "MAURO BANDERA" → Mauro Bandera); testo Ozonoterapia: solo difetti di codifica visibili
(`&#39;`, `&nbsp;`, "attiivazione") e spazi di punteggiatura. Nella convenzione Sara la riga "telefonare al numero verde"
era nel campo sbagliato dell'originale ed è stata spostata in "Modalità operative".

## Direzione di design

- **Il contatto viene prima di tutto:** nell'hero il numero di telefono è il titolo (72 px, sottolineato in rosso). Il rosso è riservato alle azioni di chiamata.
- **Elenchi a righe** (come un elenco telefonico) al posto delle card; croce del logo solo come marcatore di elenco; nessuna ombra, sfumatura, etichetta in maiuscolo o animazione d'ingresso.
- **Colori:** petrolio del sito originale e verde salvia ricavato dalle foto reali (vetro del bancone, poltrone).
- **Font:** Atkinson Hyperlegible (Braille Institute, licenza OFL, in `assets/fonts/`), pensato per la massima leggibilità; lo zero barrato è la sua caratteristica anti-ambiguità. Per cambiarlo modifica i due `@font-face` e `--font` in `assets/css/style.css`.

## Tono dei testi

I testi di interfaccia usano il «Lei» ("Per informazioni contatti la segreteria"). Il pulsante «Chiama 0332 287257» resta con questa dicitura come da specifica; le etichette dei pulsanti sono nominali ("Email alla segreteria", "Mappa su Google Maps"). I testi riportati dall'originale (modalità operative delle convenzioni) sono fedeli, con il solo passaggio dal «tu» al «Lei» in Sanicard e Sara.

## Note tecniche

- Nessuno script di terze parti, nessun cookie, nessun iframe (la mappa è un link a Google Maps).
- Un solo CSS e un solo JS; JS usato solo per menu mobile e filtri di ricerca (la navigazione funziona anche senza JS).
- Le immagini sono WebP con `width`/`height`, lazy tranne l'hero.
