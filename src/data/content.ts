/**
 * Dati MOCK per S1 (frontend-only).
 * In S3 questi verranno sostituiti dalle REST di WordPress headless,
 * mantenendo le stesse "shape" (interfacce qui sotto) così i componenti
 * non dovranno cambiare.
 */

export interface Service {
  slug: string;
  title: string;
  summary: string;
  bullets: string[];
  icon: 'web' | 'ux' | 'erp' | 'ecommerce';
}

export interface Tech {
  name: string;
  category: 'Frontend' | 'Backend' | 'CMS' | 'Infra' | 'Design';
}

export interface CaseStudy {
  slug: string;
  client: string;
  title: string;
  category: string;
  result: string;
  tech: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  skills: string[];
  initials: string;
}

export interface ManifestoPoint {
  /** Ciò che NON facciamo (mostrato barrato). */
  strike: string;
  /** Ciò che facciamo davvero (evidenziato). */
  truth: string;
}

/** Sezione manifesto "negazione": racconta il posizionamento per contrasto. */
export const manifesto: ManifestoPoint[] = [
  {
    strike: 'Non vendiamo template preconfezionati.',
    truth: 'Costruiamo prodotti su misura, pensati per durare e crescere.',
  },
  {
    strike: 'Non rincorriamo ogni moda tecnologica.',
    truth: 'Uniamo tecnologie innovative e best practice consolidate.',
  },
  {
    strike: 'Non trattiamo la SEO come un ritocco finale.',
    truth: "La progettiamo dentro l'architettura, dalla prima riga di codice.",
  },
  {
    strike: 'Non scriviamo codice e ci dileguiamo.',
    truth: "Lavoriamo a fianco del tuo team, dall'idea al lancio e oltre.",
  },
  {
    strike: "Non sacrifichiamo la velocità per l'effetto.",
    truth: 'Design accattivante e performance vivono insieme, sempre.',
  },
];

export const services: Service[] = [
  {
    slug: 'presenza-online',
    title: 'Presenza online',
    summary:
      'Siti istituzionali e landing veloci e indicizzabili, costruiti per convertire e per posizionarsi sui motori di ricerca.',
    bullets: ['Siti vetrina e corporate', 'Landing page ad alta conversione', 'SEO tecnica e contenutistica', 'Performance e Core Web Vitals'],
    icon: 'web',
  },
  {
    slug: 'ux-ui',
    title: 'UX/UI Design',
    summary:
      'Progettiamo interfacce chiare e desiderabili: dalla ricerca utente al design system, fino al prototipo navigabile.',
    bullets: ['User research e wireframing', 'Design system riutilizzabili', 'Prototipi interattivi', 'Accessibilità (WCAG)'],
    icon: 'ux',
  },
  {
    slug: 'gestionali',
    title: 'Gestionali su misura',
    summary:
      'Applicativi e gestionali web che digitalizzano i processi aziendali, integrandosi con i sistemi che già usate.',
    bullets: ['Web app e portali interni', 'Automazione dei processi', 'Integrazioni e API', 'Dashboard e reportistica'],
    icon: 'erp',
  },
  {
    slug: 'ecommerce',
    title: 'E-commerce',
    summary:
      'Negozi online scalabili e ottimizzati per la vendita, dal catalogo al checkout, con attenzione a SEO e analytics.',
    bullets: ['Store performanti e scalabili', 'Checkout ottimizzato', 'Integrazione pagamenti e logistica', 'SEO prodotto e tracking'],
    icon: 'ecommerce',
  },
];

export const techStack: Tech[] = [
  { name: 'React', category: 'Frontend' },
  { name: 'Astro', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'Vite', category: 'Frontend' },
  { name: 'WordPress Headless', category: 'CMS' },
  { name: 'PHP', category: 'Backend' },
  { name: 'REST API', category: 'Backend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'MySQL', category: 'Backend' },
  { name: 'Figma', category: 'Design' },
  { name: 'Docker', category: 'Infra' },
  { name: 'Git', category: 'Infra' },
];

export const caseStudies: CaseStudy[] = [
  {
    slug: 'retail-ecommerce',
    client: 'Cliente Retail',
    title: 'E-commerce headless multi-catalogo',
    category: 'E-commerce',
    result: '+38% conversioni, LCP < 1.8s',
    tech: ['Astro', 'WordPress', 'REST API'],
  },
  {
    slug: 'gestionale-logistica',
    client: 'Cliente Logistica',
    title: 'Gestionale ordini e magazzino',
    category: 'Gestionale',
    result: '−60% tempo di evasione ordini',
    tech: ['React', 'PHP', 'MySQL'],
  },
  {
    slug: 'corporate-seo',
    client: 'Cliente B2B',
    title: 'Sito corporate ottimizzato SEO',
    category: 'Presenza online',
    result: 'Prima pagina su keyword di settore',
    tech: ['Astro', 'WordPress', 'SEO'],
  },
  {
    slug: 'portale-corsi',
    client: 'Cliente Formazione',
    title: 'Portale corsi con area utente',
    category: 'Gestionale',
    result: '+45% iscrizioni online',
    tech: ['React', 'WordPress', 'REST API'],
  },
  {
    slug: 'restyle-uxui',
    client: 'Cliente Servizi',
    title: 'Restyle UX/UI e design system',
    category: 'UX/UI Design',
    result: '−32% bounce rate',
    tech: ['Figma', 'Astro', 'Design System'],
  },
  {
    slug: 'ecommerce-food',
    client: 'Cliente Food',
    title: 'E-commerce food con abbonamenti',
    category: 'E-commerce',
    result: 'Checkout ricorrente automatizzato',
    tech: ['Astro', 'WordPress', 'Pagamenti'],
  },
];

export const team: TeamMember[] = [
  { name: 'Nome Cognome', role: 'Frontend & UX Lead', skills: ['React', 'Astro', 'UI Design'], initials: 'FC' },
  { name: 'Nome Cognome', role: 'Backend & Sistemi', skills: ['PHP', 'WordPress', 'API'], initials: 'BS' },
  { name: 'Nome Cognome', role: 'UX/UI Designer', skills: ['Figma', 'Design System', 'Ricerca'], initials: 'UD' },
  { name: 'Nome Cognome', role: 'SEO & Performance', skills: ['SEO tecnica', 'Analytics', 'CWV'], initials: 'SP' },
];
