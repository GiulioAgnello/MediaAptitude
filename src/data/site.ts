/**
 * Configurazione centralizzata del sito.
 * Tutti i dati "globali" (brand, navigazione, contatti) stanno qui:
 * un solo punto da modificare, niente valori sparsi nei componenti.
 */

export const site = {
  name: 'Media Aptitude',
  legalName: 'Media Aptitude',
  tagline: 'Studio IT consociato',
  // Descrizione di default usata per la SEO quando una pagina non ne fornisce una.
  description:
    'Media Aptitude è uno studio IT consociato: presenza online, UX/UI design, gestionali ed e-commerce. Tecnologie innovative e best practice consolidate.',
  url: 'https://www.mediaaptitude.it',
  locale: 'it_IT',
  lang: 'it',
  email: 'info@mediaaptitude.it',
  // Default Open Graph image (da sostituire con asset reale in S4).
  ogImage: '/og-default.png',
} as const;

export type NavItem = { label: string; href: string };

export const mainNav: NavItem[] = [
  { label: 'Servizi', href: '/#servizi' },
  { label: 'Approccio', href: '/#approccio' },
  { label: 'Lavori', href: '/#lavori' },
  { label: 'Team', href: '/#team' },
  { label: 'Contatti', href: '/#contatti' },
];

export const cta = {
  label: 'Richiedi informazioni',
  href: '/#contatti',
} as const;
