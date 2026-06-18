# Media Aptitude — Core (plugin WordPress headless)

Backend del sito Media Aptitude. WordPress gestisce i contenuti, Astro li
consuma via REST in fase di build. Nessuna dipendenza esterna (composer è
opzionale: c'è un autoloader interno).

## Cosa fa (Sprint S2)

- **CPT**: Servizi (`ma_service`), Case study (`ma_case_study`), Team (`ma_team_member`), Lead (`ma_lead`, interno).
- **Campi custom** editabili da meta box classici (no ACF).
- **REST API** su `/wp-json/mediaaptitude/v1/`:
  - `GET /services` → `{ slug, title, summary, bullets[], icon }`
  - `GET /case-studies` → `{ slug, client, title, category, result, tech[] }`
  - `GET /team` → `{ name, role, skills[], initials }`
  - `GET /seo` (`?id=` opzionale) → `yoast_head_json` (Yoast) o fallback dalle opzioni del sito
  - `POST /lead` → crea un lead + notifica email *(predisposto, collegato al form in S4)*
- Le liste sono ordinate per il campo **Ordine** (menu_order) e poi per titolo.

## Installazione

1. Copia la cartella `mediaaptitude-core/` in `wp-content/plugins/`.
2. WordPress → Plugin → attiva **Media Aptitude — Core**.
3. Se chiamando un endpoint ottieni 404, vai in Impostazioni → Permalink e premi *Salva* (rigenera i rewrite).

## Note hosting (Serverplan)

- Richiede **PHP 8.1+**.
- Astro fetcha la REST in fase di `astro build` (lato Node): nessun problema di CORS in produzione.
- Per le email dei lead (S4) configurare un **SMTP autenticato** per la deliverability.
  La notifica è disattivabile col filtro `ma_core_lead_notify`.

## Struttura

```
mediaaptitude-core.php   bootstrap + autoloader + attivazione
src/Plugin.php           orchestratore (collega i moduli)
src/PostTypes/           PostType (base) + Service/CaseStudy/TeamMember/Lead
src/Admin/MetaBoxes.php  meta box per i campi custom
src/Rest/RestController  endpoint REST (liste + POST /lead)
src/Seo/Seo.php          passthrough yoast_head_json + fallback
```
