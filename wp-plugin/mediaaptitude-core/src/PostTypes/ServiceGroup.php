<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CPT Gruppo di servizi = una pagina /servizi/[slug].
 * Shape JSON (uguale a src/data/content.ts → ServiceGroup, con i servizi
 * inclusi già risolti in `services`):
 *   { slug, title, label, description, icon,
 *     seo: { title, description, h1, intro },
 *     services: [{ icon, title, summary, bullets[] }],
 *     faqs: [{ question, answer }],
 *     seoImage, seoNoindex }
 */
final class ServiceGroup extends PostType
{
    /** Icone disponibili nel frontend (Icon.astro). */
    private const ICONS = ['web', 'app', 'ecommerce', 'seo', 'ads', 'crm', 'training', 'ai'];

    public function key(): string
    {
        return 'ma_service_group';
    }

    public function labels(): array
    {
        return ['Gruppo servizi', 'Gruppi servizi'];
    }

    protected function menuIcon(): string
    {
        return 'dashicons-screenoptions';
    }

    public function fields(): array
    {
        return [
            'label' => [
                'label' => 'Etichetta breve (menu, tab, breadcrumb)',
                'type'  => 'text',
                'help'  => 'Es. "Siti & E-commerce".',
            ],
            'description' => [
                'label' => 'Descrizione breve (card e sezione)',
                'type'  => 'textarea',
            ],
            'icon' => [
                'label'   => 'Icona',
                'type'    => 'select',
                'options' => self::ICONS,
                'help'    => 'Deve combaciare con le icone del frontend.',
            ],
            'h1' => [
                'label' => 'Titolo H1 della pagina',
                'type'  => 'text',
            ],
            'intro' => [
                'label' => 'Paragrafo introduttivo',
                'type'  => 'textarea',
            ],
            'services' => [
                'label'    => 'Servizi inclusi',
                'type'     => 'repeater',
                'addLabel' => 'Aggiungi servizio',
                'subfields' => [
                    'title'   => ['label' => 'Titolo', 'type' => 'text'],
                    'summary' => ['label' => 'Descrizione', 'type' => 'textarea'],
                    'bullets' => ['label' => 'Punti (uno per riga)', 'type' => 'list'],
                    'icon'    => ['label' => 'Icona', 'type' => 'select', 'options' => self::ICONS],
                ],
            ],
            'faqs' => [
                'label'    => 'FAQ',
                'type'     => 'repeater',
                'addLabel' => 'Aggiungi FAQ',
                'subfields' => [
                    'question' => ['label' => 'Domanda', 'type' => 'text'],
                    'answer'   => ['label' => 'Risposta', 'type' => 'textarea'],
                ],
            ],
        ];
    }

    public function seoFields(): array
    {
        return [
            'seoTitle' => [
                'label'      => 'Meta title',
                'type'       => 'text',
                'seoCounter' => 'title',
                'help'       => 'Titolo per Google. Se vuoto usa il titolo della pagina.',
            ],
            'seoDescription' => [
                'label'      => 'Meta description',
                'type'       => 'textarea',
                'seoCounter' => 'description',
                'help'       => 'Se vuoto usa la descrizione breve.',
            ],
            'seoImage' => [
                'label' => 'Immagine di anteprima (Open Graph)',
                'type'  => 'image',
                'help'  => 'Se vuota usa quella di default del sito. 1200×630.',
            ],
            'seoNoindex' => [
                'label'         => 'Visibilità',
                'type'          => 'checkbox',
                'checkboxLabel' => 'Escludi questa pagina da Google (noindex)',
            ],
        ];
    }

    public function seoPathPrefix(): string
    {
        return 'servizi';
    }

    public function restBase(): ?string
    {
        return 'service-groups';
    }

    public function transform(\WP_Post $post): array
    {
        $title       = get_the_title($post);
        $description = $this->metaString($post->ID, 'description');
        $seoTitle    = $this->metaString($post->ID, 'seoTitle');
        $seoDesc     = $this->metaString($post->ID, 'seoDescription');
        $h1          = $this->metaString($post->ID, 'h1');

        // Servizi inclusi (repeater) → shape { icon, title, summary, bullets[] }.
        $services = array_map(
            static function (array $row): array {
                $bullets = $row['bullets'] ?? [];

                return [
                    'icon'    => is_string($row['icon'] ?? null) && $row['icon'] !== '' ? $row['icon'] : 'web',
                    'title'   => (string) ($row['title'] ?? ''),
                    'summary' => (string) ($row['summary'] ?? ''),
                    'bullets' => is_array($bullets) ? array_values($bullets) : [],
                ];
            },
            $this->metaRepeater($post->ID, 'services')
        );

        // FAQ (repeater) → shape { question, answer }.
        $faqs = array_map(
            static fn (array $row): array => [
                'question' => (string) ($row['question'] ?? ''),
                'answer'   => (string) ($row['answer'] ?? ''),
            ],
            $this->metaRepeater($post->ID, 'faqs')
        );

        return [
            'slug'        => $post->post_name,
            'title'       => $title,
            'label'       => $this->metaString($post->ID, 'label') ?: $title,
            'description' => $description,
            'icon'        => $this->metaString($post->ID, 'icon') ?: 'web',
            'seo'         => [
                'title'       => $seoTitle !== '' ? $seoTitle : $title,
                'description'=> $seoDesc !== '' ? $seoDesc : $description,
                'h1'          => $h1 !== '' ? $h1 : $title,
                'intro'       => $this->metaString($post->ID, 'intro'),
            ],
            'services'    => $services,
            'faqs'        => $faqs,
            'seoImage'    => $this->metaImageUrl($post->ID, 'seoImage', 'full'),
            'seoNoindex'  => $this->metaBool($post->ID, 'seoNoindex'),
        ];
    }
}
