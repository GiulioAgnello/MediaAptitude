/**
 * Configurazione centralizzata del sito.
 * Tutti i dati "globali" (brand, navigazione, contatti) stanno qui:
 * un solo punto da modificare, niente valori sparsi nei componenti.
 */

import { serviceGroups } from './content';
import { fetchSettings, type SiteOverrides } from '../lib/settings';

/**
 * Default statici: la fonte di verità quando WP non fornisce un valore.
 * A build-time vengono sovrascritti dai campi editati in WP admin
 * (Impostazioni → Media Aptitude), risolti una sola volta qui sotto.
 * I campi non presenti tra gli override restano ai valori di questo oggetto.
 */
const siteDefaults = {
  name: 'Media Aptitude',
  legalName: 'Media Aptitude',
  tagline: 'Agenzia digitale a Lecce e nel Salento',
  // Descrizione di default usata per la SEO quando una pagina non ne fornisce una.
  description:
    'Agenzia digitale a Lecce e nel Salento: siti web, e-commerce, web application su misura, SEO, Google e Meta Ads. Aiutiamo le imprese a trovare nuovi clienti grazie al digitale.',
  // url/locale/lang restano solo nel codice: critici per il deploy, non editabili da WP.
  url: 'https://www.media-aptitude.it',
  locale: 'it_IT',
  lang: 'it',
  email: 'info@media-aptitude.it',
  // Telefono per link tel: (es. '+39 0832 000000'). Vuoto = pulsante nascosto.
  phone: '+39 392 670 2839',
  // WhatsApp: solo cifre in formato internazionale, senza + né spazi (es. '39333...').
  // Vuoto = FAB WhatsApp nascosto.
  whatsapp: '393926702839',
  // Messaggio precompilato all'apertura della chat WhatsApp.
  whatsappMessage: 'Ciao! Vorrei informazioni sui vostri servizi.',
  // Aree geografiche servite (usate per la SEO locale e lo schema LocalBusiness).
  areaServed: ['Lecce', 'Salento', 'Puglia'] as string[],
  // --- Dati per la SEO locale (schema ProfessionalService) ---------------
  // Fascia di prezzo indicativa mostrata nei rich result (€, €€, €€€).
  priceRange: '€€',
  // Indirizzo: se compilati, arricchiscono lo schema e la coerenza NAP.
  // Lasciare '' i campi non ancora disponibili: vengono omessi dallo schema.
  streetAddress: '',
  postalCode: '',
  // Città/regione della sede (schema PostalAddress). Editabili da WP.
  addressLocality: 'Lecce',
  addressRegion: 'Puglia',
  // Coordinate geo: compilare con lat/lng reali della sede (Google Maps →
  // click destro sul punto → coordinate). Vuote = omesse dallo schema.
  geo: { lat: '', lng: '' },
  // Profili social ufficiali → sameAs (aiuta Google a collegare l'entità).
  // Es. ['https://www.instagram.com/...','https://www.linkedin.com/company/...']
  social: [] as string[],
  // Default Open Graph image.
  ogImage: '/og-default.png',
  // Analytics: inserire il Measurement ID GA4 (es. 'G-XXXXXXXXXX').
  // Se vuoto, nessuno script di tracciamento viene caricato.
  analytics: {
    ga4: '',
  },
  // Google Business: Place ID del profilo (pubblico). La API key è segreta e
  // sta in env (GOOGLE_PLACES_API_KEY). Se vuoto, le recensioni non si caricano.
  google: {
    placeId: '',
  },
};

export type Site = typeof siteDefaults;

/** Fonde i default coi valori WP: gli override valorizzati vincono, gli oggetti
 *  annidati (geo/analytics/google) si fondono campo per campo. */
function resolveSite(defaults: Site, o: SiteOverrides): Site {
  const { geo, analytics, google, ...scalars } = o;
  // Il backend invia solo i campi valorizzati (mai chiavi con valore vuoto),
  // quindi lo spread non introduce mai `undefined`: il cast è sicuro a runtime.
  return {
    ...defaults,
    ...scalars,
    geo: geo ? { ...defaults.geo, ...geo } : defaults.geo,
    analytics: analytics ? { ...defaults.analytics, ...analytics } : defaults.analytics,
    google: google ? { ...defaults.google, ...google } : defaults.google,
  } as Site;
}

// Risoluzione a build-time (una sola volta per build, condivisa da tutti gli import).
export const site: Site = resolveSite(siteDefaults, await fetchSettings());

export type NavItem = { label: string; href: string; children?: NavItem[] };

export const mainNav: NavItem[] = [
  {
    label: 'Servizi',
    href: '/#servizi',
    children: serviceGroups.map((g) => ({ label: g.label, href: `/servizi/${g.slug}` })),
  },
  { label: 'Metodo', href: '/#metodo' },
  { label: 'Lavori', href: '/lavori' },
  { label: 'Blog', href: '/blog' },
  { label: 'Chi siamo', href: '/chi-siamo' },
  { label: 'Contatti', href: '/contatti' },
];

export const cta = {
  label: 'Richiedi informazioni',
  href: '/contatti',
} as const;
