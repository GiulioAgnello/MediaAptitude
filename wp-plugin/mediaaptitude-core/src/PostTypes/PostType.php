<?php

declare(strict_types=1);

namespace MediaAptitude\Core\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Base condivisa dai custom post type.
 *
 * Ogni CPT concreto dichiara:
 *  - key()        slug interno del post type (max 20 caratteri)
 *  - labels()     etichette UI [singolare, plurale]
 *  - fields()     definizione dei campi custom (vedi sotto)
 *  - restBase()   segmento dell'endpoint REST pubblico (null = nessuna lista pubblica)
 *  - transform()  come trasformare un WP_Post nel JSON per Astro
 *
 * Formato di un campo in fields():
 *   'summary' => [
 *       'label'   => 'Riepilogo',
 *       'type'    => 'text' | 'textarea' | 'list' | 'select',
 *       'options' => ['web', 'ux'],   // solo per type 'select'
 *       'help'    => 'Testo di aiuto', // opzionale
 *   ]
 *
 * I campi 'list' si editano come textarea (una voce per riga) e si salvano
 * come array di stringhe.
 */
abstract class PostType
{
    /** Prefisso usato per le meta key, così non collidono con altri plugin. */
    protected const META_PREFIX = '_ma_';

    abstract public function key(): string;

    /** @return array{0:string,1:string} [singolare, plurale] */
    abstract public function labels(): array;

    /** @return array<string,array<string,mixed>> */
    abstract public function fields(): array;

    abstract public function restBase(): ?string;

    /** @return array<string,mixed> */
    abstract public function transform(\WP_Post $post): array;

    /** Icona dashicons nel menu admin. */
    protected function menuIcon(): string
    {
        return 'dashicons-admin-post';
    }

    /** Il CPT è interrogabile pubblicamente? (i lead no) */
    protected function isPublic(): bool
    {
        return true;
    }

    /** @return string[] */
    protected function supports(): array
    {
        // 'page-attributes' abilita il campo "Ordine" per ordinare le schede.
        return ['title', 'page-attributes'];
    }

    /**
     * Registra il post type e i relativi meta.
     */
    public function register(): void
    {
        [$singular, $plural] = $this->labels();

        register_post_type($this->key(), [
            'labels' => [
                'name'          => $plural,
                'singular_name' => $singular,
                'add_new_item'  => sprintf('Aggiungi %s', $singular),
                'edit_item'     => sprintf('Modifica %s', $singular),
                'search_items'  => sprintf('Cerca %s', $plural),
                'not_found'     => sprintf('Nessun %s trovato', $singular),
                'menu_name'     => $plural,
            ],
            'public'              => $this->isPublic(),
            'publicly_queryable'  => $this->isPublic(),
            'exclude_from_search' => !$this->isPublic(),
            'show_ui'             => true,
            'show_in_menu'        => true,
            'show_in_rest'        => true, // abilita anche l'editor a blocchi
            'has_archive'         => false,
            'hierarchical'        => false,
            'menu_icon'           => $this->menuIcon(),
            'supports'            => $this->supports(),
            'rewrite'             => $this->isPublic() ? ['slug' => $this->key()] : false,
        ]);

        $this->registerMeta();
    }

    /**
     * Registra i meta dei campi: sanitizzazione + autorizzazione.
     */
    protected function registerMeta(): void
    {
        foreach ($this->fields() as $name => $config) {
            $type    = $config['type'] ?? 'text';
            $isList  = $type === 'list';
            $isImage = $type === 'image';

            register_post_meta($this->key(), self::META_PREFIX . $name, [
                'type'              => $isList ? 'array' : ($isImage ? 'integer' : 'string'),
                'single'            => true,
                'show_in_rest'      => $isList
                    ? ['schema' => ['type' => 'array', 'items' => ['type' => 'string']]]
                    : true,
                'sanitize_callback' => $isList
                    ? [self::class, 'sanitizeList']
                    : ($isImage ? 'absint' : 'sanitize_textarea_field'),
                'auth_callback'     => static fn (): bool => current_user_can('edit_posts'),
            ]);
        }
    }

    /**
     * Sanitizza un campo lista (array di stringhe).
     *
     * @param mixed $value
     * @return string[]
     */
    public static function sanitizeList($value): array
    {
        if (!is_array($value)) {
            return [];
        }

        $clean = array_map(static fn ($item): string => sanitize_text_field((string) $item), $value);

        return array_values(array_filter($clean, static fn (string $item): bool => $item !== ''));
    }

    /**
     * Legge un meta del post.
     *
     * @return mixed
     */
    protected function meta(int $postId, string $name)
    {
        return get_post_meta($postId, self::META_PREFIX . $name, true);
    }

    /**
     * Helper: legge un meta come stringa.
     */
    protected function metaString(int $postId, string $name): string
    {
        $value = $this->meta($postId, $name);

        return is_string($value) ? $value : '';
    }

    /**
     * Helper: legge un meta come array di stringhe.
     *
     * @return string[]
     */
    protected function metaList(int $postId, string $name): array
    {
        $value = $this->meta($postId, $name);

        return is_array($value) ? array_values($value) : [];
    }

    /**
     * Helper: legge un meta immagine (ID allegato) e lo risolve in oggetto media.
     * Ritorna null se non impostato o allegato mancante.
     *
     * @return array{url:string,width:int,height:int,alt:string}|null
     */
    protected function metaImage(int $postId, string $name, string $size = 'large'): ?array
    {
        $attId = (int) $this->meta($postId, $name);
        if ($attId <= 0) {
            return null;
        }

        $src = wp_get_attachment_image_src($attId, $size);
        if (!is_array($src) || empty($src[0])) {
            return null;
        }

        return [
            'url'    => (string) $src[0],
            'width'  => (int) $src[1],
            'height' => (int) $src[2],
            'alt'    => trim((string) get_post_meta($attId, '_wp_attachment_image_alt', true)),
        ];
    }

    /** Restituisce la meta key completa (prefisso incluso). */
    public function metaKey(string $name): string
    {
        return self::META_PREFIX . $name;
    }
}
