<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CPT Servizio. Shape JSON (uguale a src/data/content.ts → Service):
 *   { slug, title, summary, bullets[], icon }
 */
final class Service extends PostType
{
    public function key(): string
    {
        return 'ma_service';
    }

    public function labels(): array
    {
        return ['Servizio', 'Servizi'];
    }

    protected function menuIcon(): string
    {
        return 'dashicons-screenoptions';
    }

    public function fields(): array
    {
        return [
            'summary' => [
                'label' => 'Riepilogo',
                'type'  => 'textarea',
                'help'  => 'Una/due frasi che descrivono il servizio.',
            ],
            'bullets' => [
                'label' => 'Punti chiave (uno per riga)',
                'type'  => 'list',
            ],
            'icon' => [
                'label'   => 'Icona',
                'type'    => 'select',
                'options' => ['web', 'ux', 'erp', 'ecommerce'],
                'help'    => 'Deve combaciare con le icone disponibili nel frontend.',
            ],
        ];
    }

    public function restBase(): ?string
    {
        return 'services';
    }

    public function transform(\WP_Post $post): array
    {
        return [
            'slug'    => $post->post_name,
            'title'   => get_the_title($post),
            'summary' => $this->metaString($post->ID, 'summary'),
            'bullets' => $this->metaList($post->ID, 'bullets'),
            'icon'    => $this->metaString($post->ID, 'icon') ?: 'web',
        ];
    }
}
