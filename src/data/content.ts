/**
 * Dati MOCK per S1 (frontend-only).
 * In S3 questi verranno sostituiti dalle REST di WordPress headless,
 * mantenendo le stesse "shape" (interfacce qui sotto) così i componenti
 * non dovranno cambiare.
 */

/** Immagine risolta dalla REST WP: URL + dimensioni (per evitare layout shift). */
export interface MediaImage {
  url: string;
  width: number;
  height: number;
  alt?: string;
}

export interface Service {
  slug: string;
  title: string;
  summary: string;
  bullets: string[];
  icon: 'web' | 'app' | 'ecommerce' | 'seo' | 'ads' | 'crm' | 'training';
}

/** Settore di mercato servito, per la fascia "Soluzioni per settori specifici". */
export interface Sector {
  label: string;
  description: string;
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
  /** Link al sito/lavoro già online. Se assente, la card non è cliccabile. */
  url?: string;
  /** Screenshot desktop (frame browser nel collage). */
  imageDesktop?: MediaImage | null;
  /** Screenshot mobile (frame telefono nel collage). */
  imageMobile?: MediaImage | null;
}

export interface TeamMember {
  name: string;
  role: string;
  skills: string[];
  initials: string;
  /** Ritratto. Se assente, si mostrano le iniziali. */
  photo?: MediaImage | null;
}

export interface ManifestoPoint {
  /** Ciò che NON facciamo (mostrato barrato). */
  strike: string;
  /** Ciò che facciamo davvero (evidenziato). */
  truth: string;
}

export interface Value {
  title: string;
  description: string;
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

/** Valori aziendali, mostrati nella pagina "Chi siamo". Contenuto editoriale statico. */
export const values: Value[] = [
  {
    title: 'Qualità senza compromessi',
    description:
      'Ogni dettaglio conta: codice pulito, performance e accessibilità non sono extra, ma il nostro standard minimo.',
  },
  {
    title: 'Trasparenza',
    description:
      'Tempi, scelte tecniche e costi sempre chiari. Niente sorprese: sai cosa stiamo costruendo e perché.',
  },
  {
    title: 'Partnership a lungo termine',
    description:
      'Non spariamo dopo il lancio. Restiamo al tuo fianco per far crescere il prodotto nel tempo.',
  },
  {
    title: 'Misurabilità',
    description:
      "Definiamo obiettivi concreti e li misuriamo: conversioni, velocità, posizionamento. I risultati prima delle opinioni.",
  },
];

export const services: Service[] = [
  {
    slug: 'siti-web',
    title: 'Realizzazione siti web professionali',
    summary:
      'Progettiamo siti web moderni, veloci e ottimizzati per trasformare i visitatori in clienti, partendo da identità aziendale, esperienza utente e obiettivi di business.',
    bullets: [
      'Siti aziendali e corporate',
      'Landing page ad alta conversione',
      'Performance e Core Web Vitals',
      'Ottimizzati per aziende, professionisti e studi tecnici',
    ],
    icon: 'web',
  },
  {
    slug: 'web-application',
    title: 'Web application e software su misura',
    summary:
      'Sviluppiamo web application e piattaforme digitali costruite intorno ai processi della tua azienda, per migliorare l’organizzazione, automatizzare le attività ripetitive e aumentare la produttività.',
    bullets: [
      'Portali riservati per clienti e fornitori',
      'Gestione ordini, preventivi e documenti',
      'Dashboard e reportistica personalizzata',
      'Integrazioni con ERP, CRM ed e-commerce',
    ],
    icon: 'app',
  },
  {
    slug: 'ecommerce',
    title: 'E-commerce e vendita online',
    summary:
      'Realizziamo negozi online orientati alle performance, integrando pagamenti, gestione cataloghi, marketing automation e strategie di crescita per aumentare le vendite.',
    bullets: [
      'Store performanti e scalabili',
      'Integrazione sistemi di pagamento',
      'Gestione cataloghi e logistica',
      'Marketing automation e crescita',
    ],
    icon: 'ecommerce',
  },
  {
    slug: 'seo',
    title: 'SEO e posizionamento su Google',
    summary:
      'Aiutiamo le aziende a essere trovate su Google dalle persone che stanno già cercando i loro prodotti o servizi, con strategie SEO orientate ai risultati.',
    bullets: [
      'Analisi di mercato e competitor',
      'Ricerca e strategia parole chiave',
      'SEO tecnica e on-page',
      'Posizionamento locale (Lecce e Salento)',
    ],
    icon: 'seo',
  },
  {
    slug: 'advertising',
    title: 'Google Ads e Meta Ads',
    summary:
      'Creiamo campagne pubblicitarie su Google, Facebook e Instagram per intercettare nuovi clienti nel momento in cui cercano un servizio o mostrano interesse verso un prodotto.',
    bullets: [
      'Campagne Google Search e Display',
      'Advertising su Facebook e Instagram',
      'Targeting e ottimizzazione budget',
      'Monitoraggio conversioni e ROI',
    ],
    icon: 'ads',
  },
  {
    slug: 'crm-automazioni',
    title: 'CRM e automazioni',
    summary:
      'Automatizziamo la gestione dei contatti e dei processi commerciali integrando form, campagne pubblicitarie, email marketing e CRM: nessun lead perso e risposte più veloci.',
    bullets: [
      'Integrazione form, ads e CRM',
      'Email marketing automatizzato',
      'Nessun lead perso, risposta più rapida',
      'Controllo delle opportunità commerciali',
    ],
    icon: 'crm',
  },
  {
    slug: 'formazione-consulenza',
    title: 'Formazione e consulenza',
    summary:
      'Affianchiamo aziende, enti e professionisti con percorsi di formazione e consulenza per trasferire competenze concrete e immediatamente applicabili.',
    bullets: [
      'Digital Marketing e SEO',
      'Copywriting e Social Media Marketing',
      'Cybersecurity e Design Thinking',
      'E-commerce',
    ],
    icon: 'training',
  },
];

/** Settori serviti — fascia "Soluzioni per settori specifici" (long-tail SEO). */
export const sectors: Sector[] = [
  { label: 'Edilizia e impiantistica', description: 'Siti e gestionali per imprese edili e installatori.' },
  { label: 'Industria e manifattura', description: 'Piattaforme digitali e automazioni per la produzione.' },
  { label: 'Turismo e hospitality', description: 'Presenza online e prenotazioni per strutture ricettive.' },
  { label: 'Immobiliare', description: 'Portali annunci e gestione lead per agenzie.' },
  { label: 'Enti di formazione', description: 'Portali corsi, aree riservate e iscrizioni online.' },
  { label: 'Commercio ed e-commerce', description: 'Negozi online e vendita multicanale.' },
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
