/**
 * Helper per i dati strutturati schema.org (JSON-LD).
 * Centralizzati qui per non ripetere la logica nelle pagine.
 */

export interface Crumb {
  name: string;
  /** Path relativo, es. "/chi-siamo". */
  path: string;
}

/**
 * Costruisce uno schema BreadcrumbList (il "percorso" Home › Pagina
 * che Google può mostrare sotto il titolo nei risultati di ricerca).
 *
 * @param crumbs  Voci del percorso, dalla radice alla pagina corrente.
 * @param baseUrl URL assoluto del sito (per generare gli item assoluti).
 */
export function breadcrumb(crumbs: Crumb[], baseUrl: string) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: new URL(c.path, baseUrl).href,
    })),
  };
}

/**
 * Meta SEO normalizzati provenienti da WordPress (Yoast).
 * Tutti i campi sono opzionali: ciò che manca ricade sui default statici.
 */
export interface WpSeo {
  title?: string;
  description?: string;
  noindex?: boolean;
  ogImage?: string;
}

/**
 * Estrae da `yoast_head_json` (payload dell'endpoint /seo) solo i campi
 * che ci servono, in forma normalizzata. Difensivo: tollera shape parziali.
 *
 * @param raw Oggetto restituito da getSeo(), o null se WP è offline.
 */
export function parseYoast(raw: unknown): WpSeo | null {
  if (!raw || typeof raw !== 'object') return null;
  const y = raw as Record<string, any>;

  const out: WpSeo = {};
  if (typeof y.title === 'string' && y.title.trim()) out.title = y.title.trim();
  if (typeof y.description === 'string' && y.description.trim())
    out.description = y.description.trim();
  // Yoast espone robots.index = 'index' | 'noindex'.
  if (y.robots && y.robots.index === 'noindex') out.noindex = true;
  // og_image è un array; prendiamo la prima immagine valida.
  const img = Array.isArray(y.og_image) ? y.og_image[0] : null;
  if (img && typeof img.url === 'string') out.ogImage = img.url;

  return Object.keys(out).length ? out : null;
}
