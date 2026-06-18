<?php

declare(strict_types=1);

namespace MediaAptitude\Core\Rest;

use MediaAptitude\Core\PostTypes\Lead;
use MediaAptitude\Core\PostTypes\PostType;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Endpoint REST custom su /wp-json/mediaaptitude/v1/.
 *
 * Letture (consumate da Astro in fase di build):
 *   GET /services
 *   GET /case-studies
 *   GET /team
 *
 * Scrittura (predisposta per lo Sprint S4 — form di contatto):
 *   POST /lead
 *
 * Le risposte GET hanno la stessa "shape" di src/data/content.ts, così il
 * frontend non deve cambiare passando dai mock ai dati reali.
 */
final class RestController
{
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
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        // Liste pubbliche, una per ogni CPT che dichiara una restBase().
        foreach ($this->postTypes as $postType) {
            $base = $postType->restBase();
            if ($base === null) {
                continue;
            }

            register_rest_route(MA_CORE_REST_NS, '/' . $base, [
                'methods'             => 'GET',
                'permission_callback' => '__return_true', // contenuti pubblici
                'callback'            => function () use ($postType) {
                    return $this->listItems($postType);
                },
            ]);
        }

        // POST /lead — creazione richiesta di contatto (collegato in S4).
        register_rest_route(MA_CORE_REST_NS, '/lead', [
            'methods'             => 'POST',
            'permission_callback' => '__return_true',
            'callback'            => [$this, 'createLead'],
            'args'                => [
                'name'    => ['required' => true,  'type' => 'string'],
                'email'   => ['required' => true,  'type' => 'string'],
                'message' => ['required' => true,  'type' => 'string'],
                'source'  => ['required' => false, 'type' => 'string'],
                // Honeypot anti-bot: deve restare vuoto.
                'company' => ['required' => false, 'type' => 'string'],
            ],
        ]);
    }

    /**
     * Ritorna la lista pubblicata di un CPT, ordinata per "Ordine" (menu_order)
     * e poi per titolo.
     */
    private function listItems(PostType $postType): \WP_REST_Response
    {
        $query = new \WP_Query([
            'post_type'              => $postType->key(),
            'post_status'            => 'publish',
            'posts_per_page'         => -1,
            'orderby'                => ['menu_order' => 'ASC', 'title' => 'ASC'],
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        $items = array_map(
            static fn (\WP_Post $post): array => $postType->transform($post),
            $query->posts
        );

        return new \WP_REST_Response($items, 200);
    }

    /**
     * Crea un lead e notifica via email. Pensato per il form di S4.
     *
     * @return \WP_REST_Response|\WP_Error
     */
    public function createLead(\WP_REST_Request $request)
    {
        // Honeypot: se compilato, è (quasi certamente) un bot. Fingo successo.
        if (trim((string) $request->get_param('company')) !== '') {
            return new \WP_REST_Response(['ok' => true], 200);
        }

        $name    = sanitize_text_field((string) $request->get_param('name'));
        $email   = sanitize_email((string) $request->get_param('email'));
        $message = sanitize_textarea_field((string) $request->get_param('message'));
        $source  = sanitize_text_field((string) ($request->get_param('source') ?? ''));

        if ($name === '' || $message === '') {
            return new \WP_Error('ma_lead_invalid', 'Nome e messaggio sono obbligatori.', ['status' => 422]);
        }

        if ($email === '' || !is_email($email)) {
            return new \WP_Error('ma_lead_email', 'Email non valida.', ['status' => 422]);
        }

        $lead   = new Lead();
        $postId = wp_insert_post([
            'post_type'   => $lead->key(),
            'post_status' => 'publish',
            'post_title'  => sprintf('%s — %s', $name, current_time('Y-m-d H:i')),
        ], true);

        if (is_wp_error($postId)) {
            return new \WP_Error('ma_lead_save', 'Impossibile salvare la richiesta.', ['status' => 500]);
        }

        update_post_meta($postId, $lead->metaKey('name'), $name);
        update_post_meta($postId, $lead->metaKey('email'), $email);
        update_post_meta($postId, $lead->metaKey('message'), $message);
        update_post_meta($postId, $lead->metaKey('source'), $source);

        $this->notify($name, $email, $message);

        return new \WP_REST_Response(['ok' => true], 201);
    }

    /**
     * Email di notifica all'indirizzo admin. Per la deliverability su hosting
     * condiviso (Serverplan) conviene configurare un SMTP autenticato: lo
     * faremo in S4. Disattivabile con il filtro `ma_core_lead_notify`.
     */
    private function notify(string $name, string $email, string $message): void
    {
        if (!apply_filters('ma_core_lead_notify', true)) {
            return;
        }

        $to      = get_option('admin_email');
        $subject = sprintf('[%s] Nuova richiesta di contatto', get_bloginfo('name'));
        $body    = sprintf(
            "Nome: %s\nEmail: %s\n\nMessaggio:\n%s\n",
            $name,
            $email,
            $message
        );
        $headers = [
            'Content-Type: text/plain; charset=UTF-8',
            sprintf('Reply-To: %s <%s>', $name, $email),
        ];

        wp_mail($to, $subject, $body, $headers);
    }
}
