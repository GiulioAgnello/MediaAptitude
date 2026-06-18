<?php
/**
 * Plugin Name:       Media Aptitude — Core
 * Plugin URI:        https://mediaaptitude.it
 * Description:        Backend headless per Media Aptitude: CPT (servizi, case study, team, lead), REST API custom su /wp-json/mediaaptitude/v1/ e passthrough SEO Yoast. Nessuna dipendenza esterna.
 * Version:           0.2.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            Media Aptitude
 * Text Domain:       mediaaptitude
 *
 * Sprint S2 — solo backend. Il frontend (Astro) consuma questi endpoint in
 * fase di build. Codice volutamente semplice e commentato: deve restare
 * manutenibile anche da uno sviluppatore junior.
 */

declare(strict_types=1);

namespace MediaAptitude\Core;

// Blocco accesso diretto.
if (!defined('ABSPATH')) {
    exit;
}

define('MA_CORE_VERSION', '0.2.0');
define('MA_CORE_FILE', __FILE__);
define('MA_CORE_PATH', plugin_dir_path(__FILE__));
define('MA_CORE_REST_NS', 'mediaaptitude/v1');

/**
 * Autoloader PSR-4 minimale.
 * Mappa il namespace MediaAptitude\Core\ sulla cartella src/.
 * Pensato per funzionare SENZA composer (utile su hosting condiviso come
 * Serverplan e su LocalWP, dove non sempre si lancia `composer install`).
 * Se preferisci composer, c'è anche composer.json: in quel caso questo
 * autoloader resta innocuo (carica solo classi non già caricate).
 */
spl_autoload_register(static function (string $class): void {
    $prefix = 'MediaAptitude\\Core\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = MA_CORE_PATH . 'src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

// Avvio del plugin al caricamento dei plugin.
add_action('plugins_loaded', static function (): void {
    Plugin::instance()->boot();
});

/**
 * Attivazione: registriamo i CPT e poi facciamo il flush dei rewrite,
 * così i permalink degli endpoint/CPT funzionano subito senza dover
 * ri-salvare le impostazioni dei permalink a mano.
 */
register_activation_hook(__FILE__, static function (): void {
    Plugin::instance()->registerPostTypes();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, static function (): void {
    flush_rewrite_rules();
});
