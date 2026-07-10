<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CPT Statistica (trust bar). Shape JSON (uguale a src/data/content.ts → Stat):
 *   { value, label, suffix }
 *
 * Il titolo del post è l'etichetta (es. "Progetti realizzati"); "value" e
 * "suffix" sono meta (es. value "40", suffix "+").
 */
final class Stat extends PostType
{
    public function key(): string
    {
        return 'ma_stat';
    }

    public function labels(): array
    {
        return ['Statistica', 'Statistiche'];
    }

    protected function menuIcon(): string
    {
        return 'dashicons-chart-bar';
    }

    public function fields(): array
    {
        return [
            'value' => [
                'label' => 'Valore',
                'type'  => 'text',
                'help'  => 'Solo il numero o il testo breve (es. "40", "24", "100").',
            ],
            'suffix' => [
                'label' => 'Suffisso',
                'type'  => 'text',
                'help'  => 'Opzionale, es. "+", "%", "h".',
            ],
        ];
    }

    public function restBase(): ?string
    {
        return 'stats';
    }

    public function transform(\WP_Post $post): array
    {
        return [
            'value'  => $this->metaString($post->ID, 'value'),
            'label'  => get_the_title($post),
            'suffix' => $this->metaString($post->ID, 'suffix'),
        ];
    }
}
