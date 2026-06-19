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
        add_action('admin_enqueue_scripts', [$this, 'assets']);
    }

    /**
     * Carica il media uploader di WordPress e lo script di gestione del campo
     * immagine, solo sulle schermate dei nostri CPT.
     */
    public function assets(string $hook): void
    {
        if (!in_array($hook, ['post.php', 'post-new.php'], true)) {
            return;
        }

        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if ($screen === null || !$this->isOurScreen($screen->post_type ?? '')) {
            return;
        }

        wp_enqueue_media();
        wp_add_inline_script('jquery-core', $this->mediaScript());
    }

    /** Script (vanilla su jQuery già presente) per il picker immagine. */
    private function mediaScript(): string
    {
        return <<<'JS'
jQuery(function ($) {
  $(document).on('click', '.ma-image-select', function (e) {
    e.preventDefault();
    var $field = $(this).closest('.ma-image-field');
    var frame = wp.media({ title: 'Seleziona immagine', button: { text: 'Usa immagine' }, multiple: false });
    frame.on('select', function () {
      var att = frame.state().get('selection').first().toJSON();
      var url = (att.sizes && att.sizes.medium) ? att.sizes.medium.url : att.url;
      $field.find('.ma-image-id').val(att.id);
      $field.find('.ma-image-preview').html('<img src="' + url + '" alt="" />');
      $field.find('.ma-image-remove').show();
    });
    frame.open();
  });
  $(document).on('click', '.ma-image-remove', function (e) {
    e.preventDefault();
    var $field = $(this).closest('.ma-image-field');
    $field.find('.ma-image-id').val('');
    $field.find('.ma-image-preview').empty();
    $(this).hide();
  });
});
JS;
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

                case 'image':
                    $attId  = is_numeric($current) ? (int) $current : 0;
                    $imgUrl = $attId > 0 ? wp_get_attachment_image_url($attId, 'medium') : '';
                    echo '<span class="ma-image-field">';
                    printf(
                        '<input type="hidden" class="ma-image-id" id="%s" name="%s" value="%s" />',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        esc_attr((string) $attId)
                    );
                    echo '<span class="ma-image-preview">';
                    if ($imgUrl) {
                        printf('<img src="%s" alt="" />', esc_url($imgUrl));
                    }
                    echo '</span>';
                    echo '<span class="ma-image-actions">';
                    echo '<button type="button" class="button ma-image-select">Seleziona immagine</button> ';
                    printf(
                        '<button type="button" class="button-link ma-image-remove"%s>Rimuovi</button>',
                        $attId > 0 ? '' : ' style="display:none"'
                    );
                    echo '</span>';
                    echo '</span>';
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

            $fieldType = $config['type'] ?? 'text';

            if ($fieldType === 'list') {
                $lines = preg_split('/\r\n|\r|\n/', (string) $raw) ?: [];
                $clean = PostType::sanitizeList($lines);
                update_post_meta($postId, $metaKey, $clean);
                continue;
            }

            if ($fieldType === 'image') {
                $id = absint($raw);
                if ($id > 0) {
                    update_post_meta($postId, $metaKey, $id);
                } else {
                    delete_post_meta($postId, $metaKey);
                }
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
            .ma-image-field { display:block; }
            .ma-image-preview img { display:block; max-width:240px; height:auto; margin:.4rem 0; border:1px solid #e2e8f0; border-radius:6px; }
            .ma-image-actions { display:flex; align-items:center; gap:.5rem; }
            .ma-image-remove { color:#b91c1c; }
        </style>';
    }

    private function isOurScreen(string $postType): bool
    {
        return $this->findPostType($postType) !== null;
    }
}
