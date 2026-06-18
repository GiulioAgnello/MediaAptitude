<?php

declare(strict_types=1);

namespace MediaAptitude\Core\Admin;

use MediaAptitude\Core\PostTypes\PostType;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Meta box "classici" per editare i campi custom dei CPT senza ACF né
 * dipendenze esterne. Un solo box per CPT, generato dalla definizione
 * fields() del post type.
 *
 * Stile: palette neutra blue/grey (primary #2563EB). Mai colori brand
 * nel pannello admin, come da linee guida di progetto.
 */
final class MetaBoxes
{
    private const NONCE_ACTION = 'ma_core_save_meta';
    private const NONCE_NAME   = 'ma_core_nonce';

    /** @var PostType[] */
    private array $postTypes;

    /**
     * @param PostType[] $postTypes
     */
    public function __construct(array $postTypes)
    {
        $this->postTypes = $postTypes;
    }

    public function register(): void
    {
        add_action('add_meta_boxes', [$this, 'addMetaBoxes']);
        add_action('save_post', [$this, 'save'], 10, 2);
        add_action('admin_head', [$this, 'styles']);
    }

    public function addMetaBoxes(): void
    {
        foreach ($this->postTypes as $postType) {
            if ($postType->fields() === []) {
                continue;
            }

            add_meta_box(
                'ma-core-' . $postType->key(),
                'Dettagli',
                function (\WP_Post $post) use ($postType): void {
                    $this->renderBox($postType, $post);
                },
                $postType->key(),
                'normal',
                'high'
            );
        }
    }

    private function renderBox(PostType $postType, \WP_Post $post): void
    {
        wp_nonce_field(self::NONCE_ACTION, self::NONCE_NAME);

        echo '<div class="ma-fields">';

        foreach ($postType->fields() as $name => $config) {
            $type     = $config['type'] ?? 'text';
            $label    = $config['label'] ?? $name;
            $help     = $config['help'] ?? '';
            $inputId  = 'ma_' . $name;
            $current  = get_post_meta($post->ID, $postType->metaKey($name), true);

            echo '<p class="ma-field">';
            printf('<label for="%s"><strong>%s</strong></label>', esc_attr($inputId), esc_html($label));

            switch ($type) {
                case 'textarea':
                    printf(
                        '<textarea id="%s" name="%s" rows="3" class="widefat">%s</textarea>',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        esc_textarea(is_string($current) ? $current : '')
                    );
                    break;

                case 'list':
                    $value = is_array($current) ? implode("\n", $current) : '';
                    printf(
                        '<textarea id="%s" name="%s" rows="4" class="widefat" placeholder="Una voce per riga">%s</textarea>',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        esc_textarea($value)
                    );
                    break;

                case 'select':
                    $options = $config['options'] ?? [];
                    printf('<select id="%s" name="%s" class="widefat">', esc_attr($inputId), esc_attr($inputId));
                    foreach ($options as $option) {
                        printf(
                            '<option value="%1$s"%2$s>%1$s</option>',
                            esc_attr((string) $option),
                            selected($current, $option, false)
                        );
                    }
                    echo '</select>';
                    break;

                case 'text':
                default:
                    printf(
                        '<input type="text" id="%s" name="%s" class="widefat" value="%s" />',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        esc_attr(is_string($current) ? $current : '')
                    );
                    break;
            }

            if ($help !== '') {
                printf('<span class="ma-help">%s</span>', esc_html($help));
            }

            echo '</p>';
        }

        echo '</div>';
    }

    /**
     * Salva i meta. Guardie: nonce, autosave, capability, post type corretto.
     */
    public function save(int $postId, \WP_Post $post): void
    {
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        $nonce = isset($_POST[self::NONCE_NAME]) ? sanitize_text_field(wp_unslash($_POST[self::NONCE_NAME])) : '';
        if ($nonce === '' || !wp_verify_nonce($nonce, self::NONCE_ACTION)) {
            return;
        }

        if (!current_user_can('edit_post', $postId)) {
            return;
        }

        $postType = $this->findPostType($post->post_type);
        if ($postType === null) {
            return;
        }

        foreach ($postType->fields() as $name => $config) {
            $inputId = 'ma_' . $name;
            $metaKey = $postType->metaKey($name);

            if (!isset($_POST[$inputId])) {
                continue;
            }

            $raw = wp_unslash($_POST[$inputId]);

            if (($config['type'] ?? 'text') === 'list') {
                $lines = preg_split('/\r\n|\r|\n/', (string) $raw) ?: [];
                $clean = PostType::sanitizeList($lines);
                update_post_meta($postId, $metaKey, $clean);
                continue;
            }

            update_post_meta($postId, $metaKey, sanitize_textarea_field((string) $raw));
        }
    }

    private function findPostType(string $key): ?PostType
    {
        foreach ($this->postTypes as $postType) {
            if ($postType->key() === $key) {
                return $postType;
            }
        }

        return null;
    }

    /**
     * Piccolo stile per i campi. Palette neutra, nessun colore brand.
     */
    public function styles(): void
    {
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if ($screen === null || !$this->isOurScreen($screen->post_type ?? '')) {
            return;
        }

        echo '<style>
            .ma-fields .ma-field { margin: 0 0 1.1rem; }
            .ma-fields label { display:block; margin-bottom:.35rem; color:#1e293b; }
            .ma-fields .ma-help { display:block; margin-top:.3rem; color:#64748b; font-size:12px; }
            .ma-fields input:focus, .ma-fields textarea:focus, .ma-fields select:focus {
                border-color:#2563eb; box-shadow:0 0 0 1px #2563eb;
            }
        </style>';
    }

    private function isOurScreen(string $postType): bool
    {
        return $this->findPostType($postType) !== null;
    }
}
