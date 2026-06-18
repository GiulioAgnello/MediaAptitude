<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CPT Lead (richieste di contatto). NON pubblico: visibile solo in admin.
 *
 * In S2 è solo predisposto: i lead verranno creati dall'endpoint
 * POST /lead, che sarà collegato al form di contatto nello Sprint S4.
 */
final class Lead extends PostType
{
    public function key(): string
    {
        return 'ma_lead';
    }

    public function labels(): array
    {
        return ['Lead', 'Lead'];
    }

    protected function menuIcon(): string
    {
        return 'dashicons-email-alt';
    }

    protected function isPublic(): bool
    {
        return false;
    }

    protected function supports(): array
    {
        return ['title'];
    }

    public function fields(): array
    {
        return [
            'name' => [
                'label' => 'Nome',
                'type'  => 'text',
            ],
            'email' => [
                'label' => 'Email',
                'type'  => 'text',
            ],
            'message' => [
                'label' => 'Messaggio',
                'type'  => 'textarea',
            ],
            'source' => [
                'label' => 'Provenienza',
                'type'  => 'text',
                'help'  => 'Pagina/origine della richiesta.',
            ],
        ];
    }

    public function restBase(): ?string
    {
        // Nessuna lista pubblica: i lead non si espongono via GET.
        return null;
    }

    public function transform(\WP_Post $post): array
    {
        return [
            'id'      => $post->ID,
            'name'    => $this->metaString($post->ID, 'name'),
            'email'   => $this->metaString($post->ID, 'email'),
            'message' => $this->metaString($post->ID, 'message'),
            'source'  => $this->metaString($post->ID, 'source'),
            'date'    => get_post_time('c', true, $post),
        ];
    }
}
