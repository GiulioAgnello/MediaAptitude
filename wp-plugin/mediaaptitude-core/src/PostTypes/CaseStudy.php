<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CPT Case study / Lavoro. Shape JSON (uguale a content.ts → CaseStudy):
 *   { slug, client, title, category, result, summary?, bodyHtml?, tech[], url?,
 *     imageDesktop?: {url,width,height,alt}, imageMobile?: {...} }
 */
final class CaseStudy extends PostType
{
    public function key(): string
    {
        return 'ma_case_study';
    }

    public function labels(): array
    {
        return ['Case study', 'Case study'];
    }

    protected function menuIcon(): string
    {
        return 'dashicons-portfolio';
    }

    public function fields(): array
    {
        return [
            'client' => [
                'label' => 'Cliente',
                'type'  => 'text',
            ],
            'category' => [
                'label' => 'Categoria',
                'type'  => 'text',
                'help'  => 'Es. E-commerce, Gestionale, Presenza online, UX/UI Design.',
            ],
            'result' => [
                'label' => 'Risultato',
                'type'  => 'text',
                'help'  => 'Il dato che colpisce. Es. "+38% conversioni, LCP < 1.8s".',
            ],
            'summary' => [
                'label' => 'Sommario (intro pagina dettaglio)',
                'type'  => 'textarea',
                'help'  => 'Uno/due frasi che introducono il progetto.',
            ],
            'body' => [
                'label' => 'Descrizione progetto',
                'type'  => 'wysiwyg',
                'help'  => 'Testo lungo del progetto, con formattazione (titoli, grassetto, elenchi, rientri). Compare solo nella pagina dettaglio, non in home.',
            ],
            'challenge' => [
                'label' => 'La sfida',
                'type'  => 'textarea',
            ],
            'solution' => [
                'label' => 'La soluzione',
                'type'  => 'textarea',
            ],
            'process' => [
                'label' => 'Processo / fasi (una per riga)',
                'type'  => 'list',
            ],
            'results' => [
                'label' => 'Risultati dettagliati (uno per riga)',
                'type'  => 'list',
            ],
            'tech' => [
                'label' => 'Tecnologie (una per riga)',
                'type'  => 'list',
            ],
            'url' => [
                'label' => 'Link al sito online',
                'type'  => 'text',
                'help'  => 'URL del lavoro pubblicato. Se vuoto, la card non è cliccabile.',
            ],
            'imageDesktop' => [
                'label' => 'Immagine desktop (browser)',
                'type'  => 'image',
                'help'  => 'Screenshot della versione desktop. Consigliato 16:10.',
            ],
            'imageMobile' => [
                'label' => 'Immagine mobile (webapp)',
                'type'  => 'image',
                'help'  => 'Screenshot della versione mobile. Consigliato 9:18.',
            ],
        ];
    }

    /** Campi SEO → box "SEO" dedicato (anteprima snippet + contatori). */
    public function seoFields(): array
    {
        return [
            'seoTitle' => [
                'label'      => 'Meta title',
                'type'       => 'text',
                'seoCounter' => 'title',
                'help'       => 'Titolo per Google e social. Se vuoto usa il titolo del progetto.',
            ],
            'seoDescription' => [
                'label'      => 'Meta description',
                'type'       => 'textarea',
                'seoCounter' => 'description',
                'help'       => 'Riassunto mostrato nei risultati Google. Se vuoto usa il sommario.',
            ],
            'seoImage' => [
                'label' => 'Immagine di anteprima (Open Graph)',
                'type'  => 'image',
                'help'  => 'Immagine per la condivisione social. Se vuota usa quella di default del sito. 1200×630.',
            ],
            'seoNoindex' => [
                'label'         => 'Visibilità',
                'type'          => 'checkbox',
                'checkboxLabel' => 'Escludi questo progetto da Google (noindex)',
                'help'          => 'Attiva solo se non vuoi che il progetto compaia nei risultati di ricerca.',
            ],
        ];
    }

    public function seoPathPrefix(): string
    {
        return 'lavori';
    }

    public function restBase(): ?string
    {
        return 'case-studies';
    }

    public function transform(\WP_Post $post): array
    {
        $url  = $this->metaString($post->ID, 'url');
        $body = $this->metaString($post->ID, 'body');

        return [
            'slug'         => $post->post_name,
            'client'       => $this->metaString($post->ID, 'client'),
            'title'        => get_the_title($post),
            'category'     => $this->metaString($post->ID, 'category'),
            'result'       => $this->metaString($post->ID, 'result'),
            'summary'      => $this->metaString($post->ID, 'summary'),
            // HTML pronto per il render: wpautop trasforma i capoversi in <p>
            // anche quando il testo è stato inserito senza tag di blocco.
            'bodyHtml'     => $body !== '' ? wpautop($body) : '',
            'challenge'    => $this->metaString($post->ID, 'challenge'),
            'solution'     => $this->metaString($post->ID, 'solution'),
            'process'      => $this->metaList($post->ID, 'process'),
            'results'      => $this->metaList($post->ID, 'results'),
            'tech'         => $this->metaList($post->ID, 'tech'),
            'url'          => $url !== '' ? esc_url_raw($url) : null,
            'imageDesktop' => $this->metaImage($post->ID, 'imageDesktop', 'large'),
            'imageMobile'  => $this->metaImage($post->ID, 'imageMobile', 'medium_large'),

            // SEO per singolo case study (vince sui default nella pagina dettaglio).
            'seoTitle'       => $this->metaString($post->ID, 'seoTitle'),
            'seoDescription' => $this->metaString($post->ID, 'seoDescription'),
            'seoImage'       => $this->metaImageUrl($post->ID, 'seoImage', 'full'),
            'seoNoindex'     => $this->metaBool($post->ID, 'seoNoindex'),
        ];
    }
}
