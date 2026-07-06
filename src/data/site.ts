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
  // Aree geografiche servite (usate per la SEO locale e lo schema LocalBusiness).
  areaServed: ['Lecce', 'Salento', 'Puglia'],
  // Default Open Graph image (da sostituire con asset reale in S4).
  ogImage: '/og-default.png',
} as const;

export type NavItem = { label: string; href: string; children?: NavItem[] };

export const mainNav: NavItem[] = [
  {
    label: 'Servizi',
    href: '/#servizi',
    children: serviceGroups.map((g) => ({ label: g.label, href: `/servizi/${g.slug}` })),
  },
  { label: 'Metodo', href: '/#metodo' },
  { label: 'Lavori', href: '/#lavori' },
  { label: 'Blog', href: '/blog' },
  { label: 'Chi siamo', href: '/chi-siamo' },
  { label: 'Contatti', href: '/contatti' },
];

export const cta = {
  label: 'Richiedi informazioni',
  href: '/contatti',
} as const;
