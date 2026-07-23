<?php

declare(strict_types=1);

namespace MediaAptitude\Core\Admin;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Impostazioni globali del sito, editabili da WP admin e consumate dal
 * frontend Astro a build-time via GET /wp-json/mediaaptitude/v1/settings.
 *
 * Sono i dati "di identità" e di SEO locale che prima vivevano solo nel codice
 * (src/data/site.ts): nome, contatti, indirizzo, geo, aree servite, social,
 * OG image di default. Il frontend li fa vincere sui default statici; i campi
 * lasciati vuoti qui NON sovrascrivono nulla (restano i default del codice).
 *
 * Tutto in un'unica option `ma_core_settings` (array). Palette blue/grey,
 * mai colori brand nel pannello admin (linee guida di progetto).
 */
final class Settings
{
    private const OPTION     = 'ma_core_settings';
    private const PAGE       = 'ma-core-settings';
    private const NONCE_ACT  = 'ma_core_save_settings';
    private const NONCE_NAME = 'ma_core_settings_nonce';
    private const SAVE_ACTION = 'ma_save_settings';

    public function register(): void
    {
        add_action('admin_menu', [$this, 'addPage']);
        add_action('admin_post_' . self::SAVE_ACTION, [$this, 'save']);
        add_action('admin_enqueue_scripts', [$this, 'assets']);
        add_action('rest_api_init', [$this, 'registerRoute']);
    }

    /**
     * Schema dei campi, raggruppati per sezione. Ogni campo:
     *   'type' => 'text'|'textarea'|'image'|'select'|'list'
     *   'help' => testo di aiuto (opzionale)
     *   'options' => [...] (solo select)
     *
     * @return array<string,array<string,array<string,mixed>>>
     */
    private function schema(): array
    {
        return [
            'Identità' => [
                'name'        => ['label' => 'Nome del sito', 'type' => 'text'],
                'legalName'   => ['label' => 'Ragione sociale', 'type' => 'text', 'help' => 'Usata nello schema Organization e nei footer legali.'],
                'tagline'     => ['label' => 'Tagline', 'type' => 'text'],
                'description' => ['label' => 'Meta description di default', 'type' => 'textarea', 'help' => 'Usata quando una pagina non ne fornisce una propria. 150-160 caratteri consigliati.'],
                'ogImage'     => ['label' => 'Immagine Open Graph di default', 'type' => 'image', 'help' => 'Anteprima social (consigliato 1200×630).'],
            ],
            'Contatti' => [
                'email'           => ['label' => 'Email', 'type' => 'text'],
                'phone'           => ['label' => 'Telefono', 'type' => 'text', 'help' => 'Formato internazionale, es. +39 392 670 2839.'],
                'whatsapp'        => ['label' => 'WhatsApp', 'type' => 'text', 'help' => 'Solo cifre in formato internazionale, senza + né spazi (es. 393926702839).'],
                'whatsappMessage' => ['label' => 'Messaggio WhatsApp precompilato', 'type' => 'text'],
            ],
            'SEO locale (schema ProfessionalService)' => [
                'streetAddress'   => ['label' => 'Indirizzo (via e numero)', 'type' => 'text'],
                'postalCode'      => ['label' => 'CAP', 'type' => 'text'],
                'addressLocality' => ['label' => 'Città', 'type' => 'text', 'help' => 'Es. Lecce.'],
                'addressRegion'   => ['label' => 'Regione', 'type' => 'text', 'help' => 'Es. Puglia.'],
                'geoLat'          => ['label' => 'Latitudine', 'type' => 'text', 'help' => 'Google Maps → click destro sul punto → coordinate.'],
                'geoLng'          => ['label' => 'Longitudine', 'type' => 'text'],
                'priceRange'      => ['label' => 'Fascia di prezzo', 'type' => 'select', 'options' => ['', '€', '€€', '€€€', '€€€€']],
                'areaServed'      => ['label' => 'Aree servite (una per riga)', 'type' => 'list', 'help' => 'Es. Lecce, Salento, Puglia.'],
            ],
            'Social & tracking' => [
                'social'  => ['label' => 'Profili social (uno per riga)', 'type' => 'list', 'help' => 'URL completi → sameAs. Es. https://www.instagram.com/...'],
                'ga4'     => ['label' => 'Google Analytics 4 — Measurement ID', 'type' => 'text', 'help' => 'Es. G-XXXXXXXXXX. Vuoto = nessun tracciamento.'],
                'placeId' => ['label' => 'Google Business — Place ID', 'type' => 'text', 'help' => 'Pubblico. Serve per importare le recensioni.'],
            ],
        ];
    }

    /** Tutti i campi in un'unica mappa nome→config (comodo per save/render). */
    private function flatFields(): array
    {
        $flat = [];
        foreach ($this->schema() as $fields) {
            foreach ($fields as $name => $config) {
                $flat[$name] = $config;
            }
        }

        return $flat;
    }

    public function addPage(): void
    {
        add_options_page(
            'Media Aptitude — Impostazioni',
            'Media Aptitude',
            'manage_options',
            self::PAGE,
            [$this, 'renderPage']
        );
    }

    /** Carica il media uploader solo sulla nostra pagina impostazioni. */
    public function assets(string $hook): void
    {
        if ($hook !== 'settings_page_' . self::PAGE) {
            return;
        }

        wp_enqueue_media();
        wp_add_inline_script('jquery-core', $this->mediaScript());
    }

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

    public function renderPage(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $values = get_option(self::OPTION, []);
        $values = is_array($values) ? $values : [];
        $saved  = isset($_GET['ma-saved']); // notice dopo il redirect di save()

        echo '<div class="wrap ma-settings">';
        echo '<h1>Media Aptitude — Impostazioni</h1>';
        echo '<p class="ma-intro">Dati globali del sito e SEO locale. Vengono letti dal sito a ogni pubblicazione (build). I campi lasciati vuoti non sovrascrivono i valori di default del codice.</p>';

        if ($saved) {
            echo '<div class="notice notice-success is-dismissible"><p>Impostazioni salvate. Ricordati di ripubblicare il sito per vederle online.</p></div>';
        }

        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        printf('<input type="hidden" name="action" value="%s" />', esc_attr(self::SAVE_ACTION));
        wp_nonce_field(self::NONCE_ACT, self::NONCE_NAME);

        foreach ($this->schema() as $section => $fields) {
            printf('<h2 class="ma-section">%s</h2>', esc_html($section));
            echo '<table class="form-table" role="presentation"><tbody>';

            foreach ($fields as $name => $config) {
                $this->renderRow($name, $config, $values[$name] ?? null);
            }

            echo '</tbody></table>';
        }

        submit_button('Salva impostazioni');
        echo '</form>';
        echo '</div>';

        $this->styles();
    }

    /**
     * @param mixed $current
     */
    private function renderRow(string $name, array $config, $current): void
    {
        $type    = $config['type'] ?? 'text';
        $label   = $config['label'] ?? $name;
        $help    = $config['help'] ?? '';
        $inputId = 'ma_' . $name;

        echo '<tr>';
        printf('<th scope="row"><label for="%s">%s</label></th>', esc_attr($inputId), esc_html($label));
        echo '<td>';

        switch ($type) {
            case 'textarea':
                printf(
                    '<textarea id="%s" name="%s" rows="3" class="large-text">%s</textarea>',
                    esc_attr($inputId),
                    esc_attr($inputId),
                    esc_textarea(is_string($current) ? $current : '')
                );
                break;

            case 'list':
                $value = is_array($current) ? implode("\n", $current) : (is_string($current) ? $current : '');
                printf(
                    '<textarea id="%s" name="%s" rows="4" class="large-text" placeholder="Una voce per riga">%s</textarea>',
                    esc_attr($inputId),
                    esc_attr($inputId),
                    esc_textarea($value)
                );
                break;

            case 'image':
                $attId  = is_numeric($current) ? (int) $current : 0;
                $imgUrl = $attId > 0 ? wp_get_attachment_image_url($attId, 'medium') : '';
                echo '<span class="ma-image-field">';
                printf('<input type="hidden" class="ma-image-id" id="%s" name="%s" value="%s" />', esc_attr($inputId), esc_attr($inputId), esc_attr((string) $attId));
                echo '<span class="ma-image-preview">';
                if ($imgUrl) {
                    printf('<img src="%s" alt="" />', esc_url($imgUrl));
                }
                echo '</span><span class="ma-image-actions">';
                echo '<button type="button" class="button ma-image-select">Seleziona immagine</button> ';
                printf('<button type="button" class="button-link ma-image-remove"%s>Rimuovi</button>', $attId > 0 ? '' : ' style="display:none"');
                echo '</span></span>';
                break;

            case 'select':
                $options = $config['options'] ?? [];
                printf('<select id="%s" name="%s">', esc_attr($inputId), esc_attr($inputId));
                foreach ($options as $option) {
                    $labelOpt = $option === '' ? '— nessuna —' : $option;
                    printf(
                        '<option value="%s"%s>%s</option>',
                        esc_attr((string) $option),
                        selected((string) $current, (string) $option, false),
                        esc_html((string) $labelOpt)
                    );
                }
                echo '</select>';
                break;

            case 'text':
            default:
                printf(
                    '<input type="text" id="%s" name="%s" class="regular-text" value="%s" />',
                    esc_attr($inputId),
                    esc_attr($inputId),
                    esc_attr(is_string($current) ? $current : '')
                );
                break;
        }

        if ($help !== '') {
            printf('<p class="description">%s</p>', esc_html($help));
        }

        echo '</td></tr>';
    }

    /** Salva l'option (nonce + capability), poi redirect con notice. */
    public function save(): void
    {
        if (!current_user_can('manage_options')) {
            wp_die('Permessi insufficienti.');
        }

        $nonce = isset($_POST[self::NONCE_NAME]) ? sanitize_text_field(wp_unslash($_POST[self::NONCE_NAME])) : '';
        if ($nonce === '' || !wp_verify_nonce($nonce, self::NONCE_ACT)) {
            wp_die('Nonce non valido.');
        }

        $clean = [];

        foreach ($this->flatFields() as $name => $config) {
            $inputId = 'ma_' . $name;
            $type    = $config['type'] ?? 'text';

            if (!isset($_POST[$inputId])) {
                continue;
            }

            $raw = wp_unslash($_POST[$inputId]);

            if ($type === 'list') {
                $lines = preg_split('/\r\n|\r|\n/', (string) $raw) ?: [];
                $items = array_map(static fn ($l): string => sanitize_text_field((string) $l), $lines);
                $clean[$name] = array_values(array_filter($items, static fn (string $l): bool => $l !== ''));
                continue;
            }

            if ($type === 'image') {
                $clean[$name] = absint($raw);
                continue;
            }

            $clean[$name] = sanitize_textarea_field((string) $raw);
        }

        update_option(self::OPTION, $clean);

        wp_safe_redirect(add_query_arg('ma-saved', '1', admin_url('options-general.php?page=' . self::PAGE)));
        exit;
    }

    /* --------------------------------------------------------------- */
    /* REST: GET /settings — shape allineata a src/data/site.ts        */
    /* --------------------------------------------------------------- */

    public function registerRoute(): void
    {
        register_rest_route(MA_CORE_REST_NS, '/settings', [
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => [$this, 'getSettings'],
        ]);
    }

    public function getSettings(): \WP_REST_Response
    {
        $o = get_option(self::OPTION, []);
        $o = is_array($o) ? $o : [];

        $out = [];

        // Stringhe semplici → incluse solo se non vuote (così non svuotano i default).
        foreach (['name', 'legalName', 'tagline', 'description', 'email', 'phone', 'whatsapp', 'whatsappMessage', 'priceRange', 'streetAddress', 'postalCode', 'addressLocality', 'addressRegion'] as $key) {
            $val = isset($o[$key]) && is_string($o[$key]) ? trim($o[$key]) : '';
            if ($val !== '') {
                $out[$key] = $val;
            }
        }

        // Liste.
        foreach (['areaServed', 'social'] as $key) {
            if (!empty($o[$key]) && is_array($o[$key])) {
                $out[$key] = array_values($o[$key]);
            }
        }

        // Geo: solo se entrambe le coordinate sono presenti.
        $lat = isset($o['geoLat']) && is_string($o['geoLat']) ? trim($o['geoLat']) : '';
        $lng = isset($o['geoLng']) && is_string($o['geoLng']) ? trim($o['geoLng']) : '';
        if ($lat !== '' && $lng !== '') {
            $out['geo'] = ['lat' => $lat, 'lng' => $lng];
        }

        // OG image: risolta in URL assoluto.
        $img = isset($o['ogImage']) ? (int) $o['ogImage'] : 0;
        if ($img > 0) {
            $url = wp_get_attachment_image_url($img, 'full');
            if (is_string($url) && $url !== '') {
                $out['ogImage'] = $url;
            }
        }

        // Tracking annidati.
        $ga4 = isset($o['ga4']) && is_string($o['ga4']) ? trim($o['ga4']) : '';
        if ($ga4 !== '') {
            $out['analytics'] = ['ga4' => $ga4];
        }
        $placeId = isset($o['placeId']) && is_string($o['placeId']) ? trim($o['placeId']) : '';
        if ($placeId !== '') {
            $out['google'] = ['placeId' => $placeId];
        }

        return new \WP_REST_Response($out, 200);
    }

    /** Stile della pagina impostazioni. Palette neutra blue/grey. */
    private function styles(): void
    {
        echo '<style>
            .ma-settings .ma-intro { max-width: 720px; color:#475569; }
            .ma-settings .ma-section { margin-top: 2rem; padding-bottom:.4rem; border-bottom:1px solid #e2e8f0; color:#1e293b; }
            .ma-settings .form-table th { color:#334155; }
            .ma-settings input:focus, .ma-settings textarea:focus, .ma-settings select:focus {
                border-color:#2563eb; box-shadow:0 0 0 1px #2563eb;
            }
            .ma-settings .ma-image-preview img { display:block; max-width:240px; height:auto; margin:.4rem 0; border:1px solid #e2e8f0; border-radius:6px; }
            .ma-settings .ma-image-actions { display:flex; align-items:center; gap:.5rem; }
            .ma-settings .ma-image-remove { color:#b91c1c; }
        </style>';
    }
}
