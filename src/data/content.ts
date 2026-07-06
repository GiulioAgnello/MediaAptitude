/**
 * Contenuti del sito. Le shape rispecchiano le REST WP
 * (fallback automatico a questi mock se WP è offline).
 * I dati statici/editoriali (gruppi servizi, steps, FAQ) vivono solo qui.
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

/** Gruppo di servizi: sezione a tab in home + pagina dedicata /servizi/[slug]. */
export interface ServiceGroup {
  slug: string;
  title: string;
  /** Titolo breve per tab e nav. */
  label: string;
  description: string;
  icon: Service['icon'];
  /** Slug dei servizi inclusi (chips nella card). */
  serviceSlugs: string[];
  /** SEO della pagina dedicata: title tag, meta description, h1 e intro. */
  seo: {
    title: string;
    description: string;
    h1: string;
    intro: string;
  };
  /** FAQ specifiche del gruppo (schema FAQPage della pagina dedicata). */
  faqs: Faq[];
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
  /** Screenshot desktop. */
  imageDesktop?: MediaImage | null;
  /** Screenshot mobile. */
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

export interface Value {
  title: string;
  description: string;
}

/** Punto di forza mostrato nel bento "Cosa ci distingue" in home. */
export interface Differentiator {
  title: string;
  description: string;
  /** Variante visiva della card (posizione del glow). */
  tone: 'amber' | 'blue';
}

/** Fase del metodo di lavoro (sezione steps 01-03). */
export interface Step {
  title: string;
  description: string;
  points: string[];
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  photo?: MediaImage | null;
}

/* ------------------------------------------------------------------ */

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

/** I 3 gruppi = tab della sezione servizi in home + pagine /servizi/[slug]. */
export const serviceGroups: ServiceGroup[] = [
  {
    slug: 'siti-web-ecommerce',
    title: 'Siti web ed e-commerce che convertono',
    label: 'Siti & E-commerce',
    description:
      'Il tuo biglietto da visita digitale e il tuo canale di vendita: siti veloci, curati e progettati per trasformare le visite in richieste e ordini.',
    icon: 'web',
    serviceSlugs: ['siti-web', 'ecommerce'],
    seo: {
      title: 'Realizzazione siti web ed e-commerce a Lecce e nel Salento',
      description:
        'Realizzazione siti web professionali ed e-commerce a Lecce e nel Salento: veloci, ottimizzati per Google e progettati per convertire. Preventivo gratuito.',
      h1: 'Realizzazione siti web ed e-commerce a Lecce',
      intro:
        'Il sito è il primo incontro tra la tua impresa e un potenziale cliente: in pochi secondi decide se fidarsi. Progettiamo siti web ed e-commerce veloci, curati nei dettagli e ottimizzati per Google fin dall’architettura, pensati per trasformare le visite in richieste di contatto e ordini.',
    },
    faqs: [
      {
        question: 'Quanto costa un sito web a Lecce?',
        answer:
          'Un sito vetrina professionale parte da un investimento contenuto; e-commerce e progetti su misura dipendono da funzionalità e catalogo. Dopo una call gratuita ricevi un preventivo dettagliato con voci e tempi chiari.',
      },
      {
        question: 'Il sito sarà anche su mobile?',
        answer:
          'Sì, ogni progetto nasce mobile-first: la maggioranza delle visite arriva da smartphone e Google indicizza prima la versione mobile. Layout, velocità e leggibilità sono ottimizzati su ogni schermo.',
      },
      {
        question: 'Posso aggiornare i contenuti in autonomia?',
        answer:
          'Sì: colleghiamo il sito a un pannello di gestione semplice, dal quale aggiorni testi, immagini e prodotti senza toccare il codice. E se preferisci delegare, ci occupiamo noi degli aggiornamenti.',
      },
    ],
  },
  {
    slug: 'seo-e-ads',
    title: 'SEO e advertising per farti trovare',
    label: 'SEO & Ads',
    description:
      'Prima pagina su Google e campagne mirate su Google, Facebook e Instagram: intercettiamo chi sta già cercando i tuoi servizi a Lecce e nel Salento.',
    icon: 'seo',
    serviceSlugs: ['seo', 'advertising'],
    seo: {
      title: 'SEO e Google Ads a Lecce: fatti trovare su Google',
      description:
        'Consulenza SEO e campagne Google Ads e Meta Ads per imprese di Lecce e del Salento: più visibilità su Google, più contatti e ritorno misurabile.',
      h1: 'SEO e advertising a Lecce e nel Salento',
      intro:
        'I tuoi clienti ti stanno già cercando su Google: la domanda è se trovano te o un concorrente. Combiniamo SEO — per costruire visibilità stabile nel tempo — e campagne Google e Meta Ads — per generare contatti da subito — con report chiari e budget sotto controllo.',
    },
    faqs: [
      {
        question: 'In quanto tempo si vedono i risultati della SEO?',
        answer:
          'I primi movimenti arrivano in 2-3 mesi, i risultati consolidati in 6-12: la SEO è un investimento che si costruisce nel tempo. Per generare contatti da subito affianchiamo campagne Google Ads mirate.',
      },
      {
        question: 'Meglio SEO o campagne a pagamento?',
        answer:
          'Non sono alternative: le Ads portano contatti immediati finché investi, la SEO costruisce visibilità che resta. La strategia più efficace per le imprese locali le combina, calibrandole su obiettivi e budget.',
      },
      {
        question: 'Come misuro il ritorno dell’investimento?',
        answer:
          'Configuriamo il tracciamento delle conversioni (richieste, chiamate, ordini) e riceviamo report periodici leggibili: sai quanti contatti sono arrivati, da quale canale e a quale costo.',
      },
    ],
  },
  {
    slug: 'software-crm',
    title: 'Software su misura, CRM e formazione',
    label: 'Software & CRM',
    description:
      'Web application costruite sui tuoi processi, automazioni che non perdono un lead e percorsi di formazione per rendere autonomo il tuo team.',
    icon: 'app',
    serviceSlugs: ['web-application', 'crm-automazioni', 'formazione-consulenza'],
    seo: {
      title: 'Web application, CRM e software su misura a Lecce',
      description:
        'Sviluppo di web application, gestionali e CRM su misura per imprese di Lecce e del Salento, con automazioni e formazione del team. Analisi gratuita.',
      h1: 'Software su misura e CRM per la tua impresa',
      intro:
        'Fogli di calcolo infiniti, dati sparsi e attività ripetitive rubano ore ogni settimana. Sviluppiamo web application e CRM costruiti sui tuoi processi reali — non il contrario — e formiamo il tuo team perché diventi autonomo nell’usarli.',
    },
    faqs: [
      {
        question: 'Perché un software su misura invece di un gestionale standard?',
        answer:
          'Un gestionale standard ti chiede di adattare i tuoi processi al software; uno su misura fa il contrario. Paghi solo le funzioni che ti servono, senza canoni per moduli inutilizzati, e il prodotto cresce con la tua azienda.',
      },
      {
        question: 'Potete integrare i sistemi che già usiamo?',
        answer:
          'Sì: integriamo ERP, e-commerce, sistemi di fatturazione e strumenti di marketing tramite API. L’obiettivo è far dialogare ciò che hai già, non sostituirlo per forza.',
      },
      {
        question: 'Il nostro team saprà usare il nuovo strumento?',
        answer:
          'La formazione fa parte del progetto: sessioni pratiche sul vostro caso reale, documentazione essenziale e supporto nei primi mesi di utilizzo. Il software funziona solo se le persone lo usano volentieri.',
      },
    ],
  },
];

/** Punti di forza — bento "Cosa ci distingue" in home. */
export const differentiators: Differentiator[] = [
  {
    title: 'Velocità reale',
    description:
      'Architetture statiche e Core Web Vitals verdi: pagine che si aprono in un istante, su qualunque connessione.',
    tone: 'amber',
  },
  {
    title: 'Su misura, mai template',
    description:
      'Ogni progetto nasce dai tuoi obiettivi e dai tuoi processi: design e codice costruiti intorno alla tua impresa.',
    tone: 'blue',
  },
  {
    title: 'SEO dentro l’architettura',
    description:
      'La visibilità su Google non è un ritocco finale: la progettiamo dalla prima riga di codice.',
    tone: 'blue',
  },
  {
    title: 'Partner, non fornitori',
    description:
      'Restiamo al tuo fianco dopo il lancio: misuriamo, ottimizziamo e facciamo crescere il progetto nel tempo.',
    tone: 'amber',
  },
];

/** Metodo di lavoro — sezione steps 01-03 in home. */
export const steps: Step[] = [
  {
    title: 'Analisi e strategia',
    description:
      'Ascoltiamo i tuoi obiettivi, studiamo mercato e concorrenti e definiamo insieme la strada più concreta per raggiungerli.',
    points: [
      'Obiettivi di business chiari e misurabili',
      'Analisi di mercato, competitor e parole chiave',
      'Piano operativo con tempi e priorità',
    ],
  },
  {
    title: 'Design e sviluppo',
    description:
      'Progettiamo l’esperienza e costruiamo il prodotto: interfacce curate, codice pulito e SEO integrata nell’architettura.',
    points: [
      'UX/UI su misura per il tuo pubblico',
      'Codice manutenibile e performance al primo posto',
      'SEO tecnica progettata, non aggiunta dopo',
    ],
  },
  {
    title: 'Lancio, misura e crescita',
    description:
      'Mettiamo online, misuriamo i risultati e ottimizziamo: il lancio è l’inizio del percorso, non la fine.',
    points: [
      'Monitoraggio di conversioni e posizionamento',
      'Ottimizzazioni continue basate sui dati',
      'Supporto e crescita nel tempo',
    ],
  },
];

/** FAQ in home — alimentano anche lo schema FAQPage (SEO). */
export const faqs: Faq[] = [
  {
    question: 'Quanto costa realizzare un sito web professionale?',
    answer:
      'Dipende da obiettivi e complessità: un sito vetrina ha costi diversi da un e-commerce o da una web application. Dopo una prima call gratuita ti inviamo un preventivo chiaro, con voci e tempi espliciti e senza costi nascosti.',
  },
  {
    question: 'In quanto tempo il sito è online?',
    answer:
      'Un sito vetrina richiede in genere 3-5 settimane, un e-commerce 6-10. Definiamo il calendario nel piano operativo iniziale e lo rispettiamo: sai sempre a che punto siamo.',
  },
  {
    question: 'Il sito sarà visibile su Google?',
    answer:
      'Sì: ottimizzazione tecnica, struttura dei contenuti e ricerca delle parole chiave fanno parte del progetto fin dall’inizio. Per obiettivi ambiziosi affianchiamo strategie SEO continuative e campagne Google Ads.',
  },
  {
    question: 'Lavorate solo con imprese di Lecce e del Salento?',
    answer:
      'Il nostro focus è il territorio: conosciamo il mercato locale e lo incontriamo di persona. Seguiamo però anche clienti nel resto della Puglia e in Italia, lavorando da remoto con gli stessi standard.',
  },
  {
    question: 'Gestite anche le campagne pubblicitarie?',
    answer:
      'Sì: progettiamo e gestiamo campagne Google Ads e Meta Ads (Facebook e Instagram), dalla strategia al monitoraggio del ritorno sull’investimento, con report chiari e budget sotto controllo.',
  },
  {
    question: 'Cosa succede dopo la messa online?',
    answer:
      'Non spariamo: monitoriamo prestazioni e risultati, applichiamo aggiornamenti e miglioramenti continui e restiamo il tuo punto di riferimento tecnico per ogni evoluzione del progetto.',
  },
];

/** Testimonianze clienti. Vuoto finché non ci sono recensioni reali: la sezione non viene renderizzata. */
export const testimonials: Testimonial[] = [];

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

/** Valori aziendali, mostrati nella pagina "Chi siamo". */
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
      'Definiamo obiettivi concreti e li misuriamo: conversioni, velocità, posizionamento. I risultati prima delle opinioni.',
  },
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
