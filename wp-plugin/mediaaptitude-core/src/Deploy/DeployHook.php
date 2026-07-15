<?php

declare(strict_types=1);

namespace MediaAptitude\Core\Deploy;

use MediaAptitude\Core\PostTypes\Lead;
use MediaAptitude\Core\PostTypes\PostType;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Deploy hook: quando un contenuto viene pubblicato o aggiornato, avvisa
 * Cloudflare Pages che ricostruisce il sito statico (auto-deploy).
 *
 * Come funziona:
 *   1. Cloudflare Pages fornisce un "Deploy Hook" = un URL segreto.
 *   2. Una POST a quell'URL fa partire una nuova build+deploy.
 *   3. Questa classe fa la POST su publish/aggiornamento dei contenuti.
 *
 * L'URL NON va hardcoded: si legge dalla costante MA_DEPLOY_HOOK_URL definita
 * in wp-config.php. Se la costante non c'è (es. in locale/LocalWP), la classe
 * non aggancia nulla → in sviluppo non parte alcuna build.
 *
 * Esempio in wp-config.php:
 *   define('MA_DEPLOY_HOOK_URL', 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxxx');
 */
final class DeployHook
{
    /** Tipi di post che, se pubblicati/aggiornati, devono ribuildare il sito. */
    private const NATIVE_TYPES = ['post', 'page'];

    /** Secondi di "debounce": coalizza raffiche di salvataggi in una sola build. */
    private const DEBOUNCE_SECONDS = 15;

    private const LOCK_KEY = 'ma_deploy_lock';

    /** @var string[] chiavi dei post type che fanno da trigger */
    private array $triggerTypes;

    /**
     * @param PostType[] $postTypes
     */
    public function __construct(array $postTypes)
    {
        // Tutti i CPT di contenuto TRANNE Lead: una nuova richiesta di contatto
        // non deve ricostruire il sito. Aggiungo i tipi nativi consumati da Astro
        // (articoli del blog e pagine legali/informative).
        $keys = [];
        foreach ($postTypes as $postType) {
            if ($postType instanceof Lead) {
                continue;
            }
            $keys[] = $postType->key();
        }

        $this->triggerTypes = array_merge($keys, self::NATIVE_TYPES);
    }

    public function register(): void
    {
        // Nessun URL configurato (es. ambiente locale) → non agganciare nulla.
        if (!defined('MA_DEPLOY_HOOK_URL') || (string) MA_DEPLOY_HOOK_URL === '') {
            return;
        }

        add_action('transition_post_status', [$this, 'maybeTrigger'], 10, 3);
    }

    /**
     * Decide se un cambio di stato di un post deve far partire una build.
     */
    public function maybeTrigger(string $newStatus, string $oldStatus, \WP_Post $post): void
    {
        // Ignora autosalvataggi e revisioni: non sono contenuti reali.
        if (wp_is_post_autosave($post) || wp_is_post_revision($post)) {
            return;
        }

        // Solo i tipi che finiscono nel sito statico.
        if (!in_array($post->post_type, $this->triggerTypes, true)) {
            return;
        }

        // Scatta solo se il contenuto è (o era) pubblicato: publish nuovo o
        // aggiornato, oppure un pubblicato che viene spublicato/cestinato.
        if ($newStatus !== 'publish' && $oldStatus !== 'publish') {
            return;
        }

        $this->trigger();
    }

    /**
     * Esegue la POST al deploy hook, con debounce per evitare build multiple.
     */
    private function trigger(): void
    {
        if (get_transient(self::LOCK_KEY)) {
            return;
        }
        set_transient(self::LOCK_KEY, 1, self::DEBOUNCE_SECONDS);

        $response = wp_remote_post((string) MA_DEPLOY_HOOK_URL, [
            'timeout'  => 15,
            // Non bloccante: il salvataggio in admin resta istantaneo.
            'blocking' => false,
            'headers'  => ['Content-Type' => 'application/json'],
            'body'     => wp_json_encode(['source' => 'mediaaptitude-core', 'time' => time()]),
        ]);

        if (is_wp_error($response)) {
            error_log('[ma-core] deploy hook non riuscito: ' . $response->get_error_message());
        }
    }
}
