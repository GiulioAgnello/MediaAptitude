# Runbook deploy — Media Aptitude su Aruba (metodo sicuro)

Obiettivo: il dominio mostra il **sito Astro** (statico), WordPress resta dov'è come
backend REST. Via il placeholder DiBot. **Nessun file WP spostato, nessuna modifica al DB.**

**Dominio canonico:** `https://www.media-aptitude.it` (con trattino, **con www** —
Aruba reindirizza il non-www al www a livello hosting, quindi ci allineiamo al www).
**Database WP:** `Sql1425429_5` (utente `Sql1425429`, host `89.46.111.186`). Backup già esportato.

---

## 1. Backup (rete di sicurezza)

- [x] **Database**: esportato da phpMyAdmin (`Sql1425429_5`).
- [x] **`.htaccess` attuale** salvato come `.htaccess.backup`.

## 2. Caricare il sito Astro sulla root

1. Scompatta `media-aptitude-build.zip`.
2. Carica **il contenuto** (non la cartella) nella root del sito, accanto ai file di WP:
   `index.html`, `_astro/`, `chi-siamo/`, `contatti/`, `sitemap-index.xml`,
   `sitemap-0.xml`, `robots.txt`, `favicon.svg`, `logo.png`, `og-default.png`.
   Sovrascrivi se chiede (è la versione allineata al www).
   (Non tocca `wp-admin`, `wp-content`, `wp-includes`, `wp-*.php`: convivono.)

Caricare i file NON cambia nulla di visibile: il sito mostra ancora il DiBot finché
non si sostituisce l'`.htaccess` (punto 3). È lo "switch".

## 3. Sostituire l'.htaccess della root

Sostituisci il contenuto dell'`.htaccess` della root con quello del file **`htaccess-nuovo.txt`**.

Cosa fa:
- `DirectoryIndex index.html index.php` → la home ora è l'`index.html` di Astro (non più WP/DiBot).
- Le pagine e gli asset di Astro (file reali) vengono serviti direttamente.
- `/wp-admin` e `/wp-json` continuano ad andare a WordPress (admin e REST funzionano).
- Le vecchie pagine DiBot (permalink WP) non vengono più servite → niente duplicati SEO.
- Mantiene le regole di cache + gzip già presenti (buone per i Core Web Vitals).

**Nota:** non ri-salvare i Permalink in wp-admin dopo, o WordPress riscrive l'`.htaccess`.

## 4. Verifica (subito dopo lo switch)

- `https://www.media-aptitude.it/` → sito Astro (non più DiBot).
- `/chi-siamo/` e `/contatti/` → OK.
- `/robots.txt` e `/sitemap-index.xml` → raggiungibili.
- `/wp-admin` → login e pannello WP funzionanti.
- `/wp-json/` → risponde (REST attiva).
- Sorgente home → `<link rel="canonical" href="https://www.media-aptitude.it/">`.

Se qualcosa non va: rimetti `.htaccess.backup` come `.htaccess` e torni allo stato precedente.

---

## 5. Contenuti reali + form (dopo il primo online)

Il build attuale mostra **contenuti mock**: la REST di WP è raggiungibile ma il plugin
`mediaaptitude-core` non è ancora attivo (endpoint `mediaaptitude/v1/*` → 404). Per i dati reali:

1. Installa/attiva il plugin `mediaaptitude-core` (cartella `wp-plugin/mediaaptitude-core/` del repo).
   Verifica: `https://www.media-aptitude.it/wp-json/mediaaptitude/v1/services`.
2. Popola i contenuti (servizi, case study, team) via i meta box del plugin.
3. Rifai il build (URL API già impostato a `https://www.media-aptitude.it/wp-json/mediaaptitude/v1`)
   e ricarica il `dist/`.

**Form contatti:** endpoint già cablato. Perché funzioni servono: plugin attivo (`/lead`),
**CORS** che accetti origine `https://www.media-aptitude.it` (filtro `ma_core_cors_origin`),
e **SMTP** autenticato su WP per la consegna email.

## Note SEO

- Dominio canonico unico: `https://www.media-aptitude.it` (www + https).
- Invia la sitemap in Search Console: `https://www.media-aptitude.it/sitemap-index.xml`.
- Se Yoast genera un suo `sitemap_index.xml` (underscore), ignoralo: quello valido è
  quello di Astro con il trattino (`sitemap-index.xml`).
- Il contenuto DiBot resta nei dati di WP ma non è più servito: si può ripulire con calma.
