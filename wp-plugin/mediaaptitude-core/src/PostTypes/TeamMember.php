<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CPT Membro del team. Shape JSON (uguale a content.ts → TeamMember):
 *   { name, role, skills[], initials, photo?: {url,width,height,alt} }
 *
 * Nota: qui il titolo del post È il nome della persona (campo "name"),
 * quindi non esponiamo lo slug.
 */
final class TeamMember extends PostType
{
    public function key(): string
    {
        return 'ma_team_member';
    }

    public function labels(): array
    {
        return ['Membro del team', 'Team'];
    }

    protected function menuIcon(): string
    {
        return 'dashicons-groups';
    }

    public function fields(): array
    {
        return [
            'role' => [
                'label' => 'Ruolo',
                'type'  => 'text',
                'help'  => 'Es. Frontend & UX Lead.',
            ],
            'initials' => [
                'label' => 'Iniziali (avatar)',
                'type'  => 'text',
                'help'  => 'Massimo 2 lettere. Es. FC.',
            ],
            'skills' => [
                'label' => 'Competenze (una per riga)',
                'type'  => 'list',
            ],
            'photo' => [
                'label' => 'Foto',
                'type'  => 'image',
                'help'  => 'Ritratto del membro. Quadrato consigliato. Se vuoto, si mostrano le iniziali.',
            ],
        ];
    }

    public function restBase(): ?string
    {
        return 'team';
    }

    public function transform(\WP_Post $post): array
    {
        return [
            'name'     => get_the_title($post),
            'role'     => $this->metaString($post->ID, 'role'),
            'skills'   => $this->metaList($post->ID, 'skills'),
            'initials' => $this->metaString($post->ID, 'initials'),
            'photo'    => $this->metaImage($post->ID, 'photo', 'medium_large'),
        ];
    }
}
