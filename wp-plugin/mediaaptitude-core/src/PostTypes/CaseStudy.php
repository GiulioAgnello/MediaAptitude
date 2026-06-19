<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CPT Case study / Lavoro. Shape JSON (uguale a content.ts → CaseStudy):
 *   { slug, client, title, category, result, tech[], url?,
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

    public function restBase(): ?string
    {
        return 'case-studies';
    }

    public function transform(\WP_Post $post): array
    {
        $url = $this->metaString($post->ID, 'url');

        return [
            'slug'         => $post->post_name,
            'client'       => $this->metaString($post->ID, 'client'),
            'title'        => get_the_title($post),
            'category'     => $this->metaString($post->ID, 'category'),
            'result'       => $this->metaString($post->ID, 'result'),
            'tech'         => $this->metaList($post->ID, 'tech'),
            'url'          => $url !== '' ? esc_url_raw($url) : null,
            'imageDesktop' => $this->metaImage($post->ID, 'imageDesktop', 'large'),
            'imageMobile'  => $this->metaImage($post->ID, 'imageMobile', 'medium_large'),
        ];
    }
}
