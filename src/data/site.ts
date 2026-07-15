/**
 * Configurazione centralizzata del sito.
 * Tutti i dati "globali" (brand, navigazione, contatti) stanno qui:
 * un solo punto da modificare, niente valori sparsi nei componenti.
 */

import { serviceGroups } from './content';

export const site = {
  name: 'Media Aptitude',
  legalName: 'Media Aptitude',
  tagline: 'Agenzia digitale a Lecce e nel Salento',
  // Descrizione di default usata per la SEO quando una pagina non ne fornisce una.
  description:
    'Agenzia digitale a Lecce e nel Salento: siti web, e-commerce, web application su misura, SEO, Google e Meta Ads. Aiutiamo le imprese a trovare nuovi clienti grazie al digitale.',
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
  areaServed: ['Lecce', 'Salento', 'Puglia'],
  // --- Dati per la SEO locale (schema ProfessionalService) ---------------
  // Fascia di prezzo indicativa mostrata nei rich result (€, €€, €€€).
  priceRange: '€€',
  // Indirizzo: se compilati, arricchiscono lo schema e la coerenza NAP.
  // Lasciare '' i campi non ancora disponibili: vengono omessi dallo schema.
  streetAddress: '',
  postalCode: '',
  // Coordinate geo: compilare con lat/lng reali della sede (Google Maps →
  // click destro sul punto → coordinate). Vuote = omesse dallo schema.
  geo: { lat: '', lng: '' },
  // Profili social ufficiali → sameAs (aiuta Google a collegare l'entità).
  // Es. ['https://www.instagram.com/...','https://www.linkedin.com/company/...']
  social: [] as string[],
  // Default Open Graph image (da sostituire con asset reale in S4).
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
} as const;

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
