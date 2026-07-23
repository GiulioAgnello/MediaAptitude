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
        wp_add_inline_script('jquery-core', $this->seoScript());
        wp_add_inline_script('jquery-core', $this->repeaterScript());
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
            if ($postType->fields() !== []) {
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

            // Box "SEO" (stile Yoast) per i CPT che dichiarano campi SEO.
            if ($postType->seoFields() !== []) {
                add_meta_box(
                    'ma-core-seo-' . $postType->key(),
                    'SEO',
                    function (\WP_Post $post) use ($postType): void {
                        $this->renderSeoBox($postType, $post);
                    },
                    $postType->key(),
                    'normal',
                    'default'
                );
            }
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

            // wysiwyg e repeater generano blocchi propri → wrapper <div>.
            $wrapTag = in_array($type, ['wysiwyg', 'repeater'], true) ? 'div' : 'p';
            printf('<%s class="ma-field ma-field--%s">', $wrapTag, esc_attr($type));
            printf('<label for="%s"><strong>%s</strong></label>', esc_attr($inputId), esc_html($label));

            switch ($type) {
                case 'repeater':
                    $this->repeaterControl($inputId, $config, is_array($current) ? array_values($current) : []);
                    break;

                case 'wysiwyg':
                    // Editor visuale nativo con toolbar completa (kitchen sink):
                    // titoli, grassetto/corsivo, elenchi, rientri, allineamento,
                    // link, citazioni. Massima personalizzazione del testo.
                    wp_editor(
                        is_string($current) ? $current : '',
                        $inputId,
                        [
                            'textarea_name' => $inputId,
                            'textarea_rows' => 12,
                            'media_buttons' => true,
                            'tinymce'       => [
                                'toolbar1' => 'formatselect,bold,italic,underline,bullist,numlist,blockquote,alignleft,aligncenter,alignright,link,unlink,outdent,indent,undo,redo,wp_adv',
                                'toolbar2' => 'strikethrough,hr,forecolor,pastetext,removeformat,charmap,wp_more,fullscreen',
                            ],
                            'quicktags'     => ['buttons' => 'strong,em,ul,ol,li,link,block,h2,h3'],
                        ]
                    );
                    break;

                case 'checkbox':
                    printf(
                        '<label class="ma-checkbox"><input type="checkbox" id="%s" name="%s" value="1"%s /> %s</label>',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        checked((bool) $current, true, false),
                        esc_html($config['checkboxLabel'] ?? 'Attiva')
                    );
                    break;

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
                    $this->imageControl($inputId, is_numeric($current) ? (int) $current : 0);
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

            printf('</%s>', $wrapTag);
        }

        echo '</div>';
    }

    /** Controllo immagine (hidden ID + preview + bottoni), condiviso tra i box. */
    private function imageControl(string $inputId, int $attId): void
    {
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
        echo '</span><span class="ma-image-actions">';
        echo '<button type="button" class="button ma-image-select">Seleziona immagine</button> ';
        printf(
            '<button type="button" class="button-link ma-image-remove"%s>Rimuovi</button>',
            $attId > 0 ? '' : ' style="display:none"'
        );
        echo '</span></span>';
    }

    /**
     * Campo "repeater": righe ripetibili con sottocampi. Ogni riga produce input
     * `ma_{campo}[{indice}][{sottocampo}]`. Una riga-template (in <script>) viene
     * clonata dal JS per aggiungerne di nuove.
     *
     * @param array<int,array<string,mixed>> $rows
     */
    private function repeaterControl(string $baseId, array $config, array $rows): void
    {
        $subfields = $config['subfields'] ?? [];
        $addLabel  = $config['addLabel'] ?? 'Aggiungi riga';

        echo '<span class="ma-rep" data-ma-rep>';
        echo '<span class="ma-rep__rows">';
        foreach ($rows as $i => $row) {
            $this->repeaterRow($baseId, (string) $i, $subfields, is_array($row) ? $row : []);
        }
        echo '</span>';

        // Template per nuove righe: dentro <script type="text/html"> così i suoi
        // input NON vengono inviati; il JS sostituisce __i__ con un indice unico.
        echo '<script type="text/html" class="ma-rep__tmpl">';
        $this->repeaterRow($baseId, '__i__', $subfields, []);
        echo '</script>';

        printf('<button type="button" class="button ma-rep__add">%s</button>', esc_html($addLabel));
        echo '</span>';
    }

    /**
     * Una riga di repeater.
     *
     * @param array<string,array<string,mixed>> $subfields
     * @param array<string,mixed>               $row
     */
    private function repeaterRow(string $baseId, string $index, array $subfields, array $row): void
    {
        echo '<span class="ma-rep__row">';
        echo '<span class="ma-rep__fields">';

        foreach ($subfields as $sub => $cfg) {
            $stype  = $cfg['type'] ?? 'text';
            $slabel = $cfg['label'] ?? $sub;
            $name   = sprintf('%s[%s][%s]', $baseId, $index, $sub);
            $val    = $row[$sub] ?? '';

            echo '<label class="ma-rep__field">';
            printf('<span class="ma-rep__lbl">%s</span>', esc_html($slabel));

            switch ($stype) {
                case 'textarea':
                    printf(
                        '<textarea name="%s" rows="2" class="widefat">%s</textarea>',
                        esc_attr($name),
                        esc_textarea(is_string($val) ? $val : '')
                    );
                    break;

                case 'list':
                    $lv = is_array($val) ? implode("\n", $val) : (is_string($val) ? $val : '');
                    printf(
                        '<textarea name="%s" rows="3" class="widefat" placeholder="Una voce per riga">%s</textarea>',
                        esc_attr($name),
                        esc_textarea($lv)
                    );
                    break;

                case 'select':
                    $opts = $cfg['options'] ?? [];
                    printf('<select name="%s" class="widefat">', esc_attr($name));
                    foreach ($opts as $o) {
                        printf(
                            '<option value="%1$s"%2$s>%1$s</option>',
                            esc_attr((string) $o),
                            selected((string) $val, (string) $o, false)
                        );
                    }
                    echo '</select>';
                    break;

                case 'text':
                default:
                    printf(
                        '<input type="text" name="%s" class="widefat" value="%s" />',
                        esc_attr($name),
                        esc_attr(is_string($val) ? $val : '')
                    );
                    break;
            }

            echo '</label>';
        }

        echo '</span>';
        echo '<button type="button" class="button-link ma-rep__remove" aria-label="Rimuovi riga">✕ Rimuovi</button>';
        echo '</span>';
    }

    /**
     * Box "SEO" stile Yoast: anteprima snippet Google (live) + campi con
     * contatore caratteri e semaforo. Salva tramite lo stesso save() dei meta.
     */
    private function renderSeoBox(PostType $postType, \WP_Post $post): void
    {
        // Nonce: garantisce il salvataggio anche per CPT con SOLI campi SEO
        // (duplicato innocuo se è presente anche il box "Dettagli").
        wp_nonce_field(self::NONCE_ACTION, self::NONCE_NAME);

        $host   = (string) preg_replace('#^https?://#', '', untrailingslashit(home_url()));
        $prefix = $postType->seoPathPrefix();
        $slug   = $post->post_name !== '' ? $post->post_name : sanitize_title(get_the_title($post));
        $urlPath = $host
            . ($prefix !== '' ? ' › ' . $prefix : '')
            . ' › ' . ($slug !== '' ? $slug : 'nuovo');

        $siteName      = (string) get_bloginfo('name');
        $fallbackTitle = trim(get_the_title($post));
        $previewTitle  = $fallbackTitle !== '' ? $fallbackTitle . ' — ' . $siteName : $siteName;
        $descPlaceholder = 'La descrizione comparirà qui: scrivi una meta description accattivante per invogliare al clic dai risultati di ricerca.';

        echo '<div class="ma-seo" data-ma-seo>';

        // Anteprima snippet (aggiornata live dal JS).
        echo '<div class="ma-snippet">';
        printf('<div class="ma-snippet__url">%s</div>', esc_html($urlPath));
        printf('<div class="ma-snippet__title" data-ma-snippet="title">%s</div>', esc_html($previewTitle));
        printf('<div class="ma-snippet__desc" data-ma-snippet="description">%s</div>', esc_html($descPlaceholder));
        echo '</div>';

        echo '<div class="ma-fields">';
        foreach ($postType->seoFields() as $name => $config) {
            $type    = $config['type'] ?? 'text';
            $label   = $config['label'] ?? $name;
            $help    = $config['help'] ?? '';
            $inputId = 'ma_' . $name;
            $current = get_post_meta($post->ID, $postType->metaKey($name), true);
            $counter = $config['seoCounter'] ?? ''; // 'title' | 'description' | ''
            $countAttr = $counter !== '' ? ' data-ma-seo-field="' . esc_attr($counter) . '"' : '';

            echo '<p class="ma-field ma-field--' . esc_attr($type) . '">';
            printf('<label for="%s"><strong>%s</strong></label>', esc_attr($inputId), esc_html($label));

            switch ($type) {
                case 'textarea':
                    printf(
                        '<textarea id="%s" name="%s" rows="3" class="widefat"%s>%s</textarea>',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        $countAttr,
                        esc_textarea(is_string($current) ? $current : '')
                    );
                    break;

                case 'image':
                    $this->imageControl($inputId, is_numeric($current) ? (int) $current : 0);
                    break;

                case 'checkbox':
                    printf(
                        '<label class="ma-checkbox"><input type="checkbox" id="%s" name="%s" value="1"%s /> %s</label>',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        checked((bool) $current, true, false),
                        esc_html($config['checkboxLabel'] ?? 'Attiva')
                    );
                    break;

                case 'text':
                default:
                    printf(
                        '<input type="text" id="%s" name="%s" class="widefat" value="%s"%s />',
                        esc_attr($inputId),
                        esc_attr($inputId),
                        esc_attr(is_string($current) ? $current : ''),
                        $countAttr
                    );
                    break;
            }

            if ($counter !== '') {
                $ideal = $counter === 'title' ? '50–60' : '120–156';
                printf(
                    '<span class="ma-count" data-ma-count="%s"><span class="ma-count__n">0</span> caratteri · ideale %s</span>',
                    esc_attr($counter),
                    esc_html($ideal)
                );
            }

            if ($help !== '') {
                printf('<span class="ma-help">%s</span>', esc_html($help));
            }

            echo '</p>';
        }
        echo '</div>';

        echo '</div>';
    }

    /** Anteprima snippet live + contatori con semaforo (vanilla su jQuery). */
    private function seoScript(): string
    {
        return <<<'JS'
jQuery(function ($) {
  var box = document.querySelector('[data-ma-seo]');
  if (!box) return;

  var snippetTitle = box.querySelector('[data-ma-snippet="title"]');
  var snippetDesc  = box.querySelector('[data-ma-snippet="description"]');
  var titleFallback = snippetTitle ? snippetTitle.textContent : '';
  var descFallback  = snippetDesc ? snippetDesc.textContent : '';

  function colorFor(len, lo, hi) {
    if (len === 0) return '';
    if (len < lo * 0.5) return 'is-bad';
    if (len < lo) return 'is-warn';
    if (len <= hi) return 'is-good';
    if (len <= hi + 15) return 'is-warn';
    return 'is-bad';
  }

  function bind(kind, lo, hi, snippetEl, fallback) {
    var input = box.querySelector('[data-ma-seo-field="' + kind + '"]');
    var counter = box.querySelector('[data-ma-count="' + kind + '"]');
    if (!input) return;
    function update() {
      var val = (input.value || '').trim();
      if (snippetEl) snippetEl.textContent = val ? val : fallback;
      var len = val.length;
      if (counter) {
        var n = counter.querySelector('.ma-count__n');
        if (n) n.textContent = String(len);
        counter.classList.remove('is-good', 'is-warn', 'is-bad');
        var c = colorFor(len, lo, hi);
        if (c) counter.classList.add(c);
      }
    }
    input.addEventListener('input', update);
    update();
  }

  bind('title', 50, 60, snippetTitle, titleFallback);
  bind('description', 120, 156, snippetDesc, descFallback);
});
JS;
    }

    /** Aggiunta/rimozione righe dei campi repeater (vanilla su jQuery). */
    private function repeaterScript(): string
    {
        return <<<'JS'
jQuery(function ($) {
  var seq = Date.now();
  $(document).on('click', '.ma-rep__add', function (e) {
    e.preventDefault();
    var wrap = $(this).closest('[data-ma-rep]');
    var tmpl = wrap.children('.ma-rep__tmpl').html() || '';
    seq++;
    wrap.children('.ma-rep__rows').append(tmpl.replace(/__i__/g, 'n' + seq));
  });
  $(document).on('click', '.ma-rep__remove', function (e) {
    e.preventDefault();
    $(this).closest('.ma-rep__row').remove();
  });
});
JS;
    }

    /**
     * Ripulisce le righe di un repeater in base ai sottocampi dichiarati.
     * Scarta le righe totalmente vuote.
     *
     * @param array<int|string,mixed>            $rows
     * @param array<string,array<string,mixed>>  $subfields
     * @return array<int,array<string,mixed>>
     */
    private function cleanRepeater(array $rows, array $subfields): array
    {
        $clean = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $cleanRow = [];
            $hasContent = false;

            foreach ($subfields as $sub => $cfg) {
                $stype = $cfg['type'] ?? 'text';
                $sval  = $row[$sub] ?? '';

                if ($stype === 'list') {
                    $lines = preg_split('/\r\n|\r|\n/', is_array($sval) ? '' : (string) $sval) ?: [];
                    $arr = PostType::sanitizeList($lines);
                    $cleanRow[$sub] = $arr;
                    if ($arr !== []) {
                        $hasContent = true;
                    }
                    continue;
                }

                $sval = is_array($sval) ? '' : (string) $sval;
                $val  = $stype === 'textarea'
                    ? sanitize_textarea_field($sval)
                    : sanitize_text_field($sval);
                $cleanRow[$sub] = $val;
                if ($val !== '') {
                    $hasContent = true;
                }
            }

            if ($hasContent) {
                $clean[] = $cleanRow;
            }
        }

        return $clean;
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

        foreach ($postType->allFields() as $name => $config) {
            $inputId   = 'ma_' . $name;
            $metaKey   = $postType->metaKey($name);
            $fieldType = $config['type'] ?? 'text';

            // Checkbox: quando è deselezionata NON arriva in POST, quindi va
            // gestita PRIMA del continue (assenza = false), altrimenti non si
            // potrebbe mai togliere il segno di spunta.
            if ($fieldType === 'checkbox') {
                update_post_meta($postId, $metaKey, isset($_POST[$inputId]));
                continue;
            }

            // Repeater: se assente (tutte le righe rimosse) salva array vuoto.
            if ($fieldType === 'repeater') {
                $rowsRaw = isset($_POST[$inputId]) && is_array($_POST[$inputId])
                    ? wp_unslash($_POST[$inputId])
                    : [];
                update_post_meta($postId, $metaKey, $this->cleanRepeater($rowsRaw, $config['subfields'] ?? []));
                continue;
            }

            if (!isset($_POST[$inputId])) {
                continue;
            }

            $raw = wp_unslash($_POST[$inputId]);

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

            if ($fieldType === 'wysiwyg') {
                // Mantiene l'HTML della formattazione, ripulito da tag/attributi
                // non ammessi (stesso set consentito nei contenuti dei post).
                update_post_meta($postId, $metaKey, wp_kses_post((string) $raw));
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

            /* --- Box SEO stile Yoast --- */
            .ma-snippet {
                border:1px solid #e2e8f0; border-radius:8px; padding:14px 16px; margin:0 0 1.2rem;
                background:#fff; max-width:600px;
            }
            .ma-snippet__url { color:#0b7a34; font-size:13px; line-height:1.3; word-break:break-word; }
            .ma-snippet__title {
                color:#1a0dab; font-size:19px; line-height:1.3; margin:.15rem 0 .2rem;
                overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical;
            }
            .ma-snippet__desc { color:#4d5156; font-size:13px; line-height:1.5; }
            .ma-count { display:block; margin-top:.3rem; font-size:12px; color:#64748b; }
            .ma-count .ma-count__n { font-weight:600; color:#334155; }
            .ma-count.is-good .ma-count__n { color:#0b7a34; }
            .ma-count.is-warn .ma-count__n { color:#b45309; }
            .ma-count.is-bad  .ma-count__n { color:#b91c1c; }
            .ma-checkbox { display:inline-flex; align-items:center; gap:.4rem; color:#334155; }

            /* --- Repeater --- */
            .ma-rep { display:block; }
            .ma-rep__rows { display:block; }
            .ma-rep__row {
                display:flex; gap:.75rem; align-items:flex-start;
                padding:12px; margin:0 0 .6rem;
                border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;
            }
            .ma-rep__fields { flex:1 1 auto; display:grid; gap:.6rem; min-width:0; }
            .ma-rep__field { display:block; }
            .ma-rep__lbl { display:block; margin-bottom:.2rem; font-size:12px; color:#64748b; }
            .ma-rep__remove { color:#b91c1c; white-space:nowrap; margin-top:1.4rem; }
            .ma-rep__add { margin-top:.2rem; }
        </style>';
    }

    private function isOurScreen(string $postType): bool
    {
        return $this->findPostType($postType) !== null;
    }
}
