/**
 * Configurazione centralizzata del sito.
 * Tutti i dati "globali" (brand, navigazione, contatti) stanno qui:
 * un solo punto da modificare, niente valori sparsi nei componenti.
 */

export const site = {
  name: 'Media Aptitude',
  legalName: 'Media Aptitude',
  tagline: 'Agenzia digitale a Lecce e nel Salento',
  // Descrizione di default usata per la SEO quando una pagina non ne fornisce una.
  description:
    'Agenzia digitale a Lecce e nel Salento: siti web, e-commerce, web application su misura, SEO, Google e Meta Ads. Aiutiamo le imprese a trovare nuovi clienti grazie al digitale.',
  url: 'https://www.mediaaptitude.it',
  locale: 'it_IT',
  lang: 'it',
  email: 'info@mediaaptitude.it',
  // Aree geografiche servite (usate per la SEO locale e lo schema LocalBusiness).
  areaServed: ['Lecce', 'Salento', 'Puglia'],
  // Default Open Graph image (da sostituire con asset reale in S4).
  ogImage: '/og-default.png',
} as const;

export type NavItem = { label: string; href: string };

export const mainNav: NavItem[] = [
  { label: 'Servizi', href: '/#servizi' },
  { label: 'Approccio', href: '/#approccio' },
  { label: 'Lavori', href: '/#lavori' },
  { label: 'Chi siamo', href: '/chi-siamo' },
  { label: 'Contatti', href: '/contatti' },
];

export const cta = {
  label: 'Richiedi informazioni',
  href: '/contatti',
} as const;
