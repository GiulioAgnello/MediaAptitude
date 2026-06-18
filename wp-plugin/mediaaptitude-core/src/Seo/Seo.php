<?php

declare(strict_types=1);

namespace MediaAptitude\Core\Seo;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Passthrough SEO per il frontend headless.
 *
 *   GET /wp-json/mediaaptitude/v1/seo            → SEO della home
 *   GET /wp-json/mediaaptitude/v1/seo?id=123     → SEO di una pagina/post
 *
 * Se Yoast è attivo restituiamo il suo `yoast_head_json` (titoli, meta,
 * canonical, Open Graph) leggendolo dalla REST core di WordPress, così non
 * dipendiamo da API interne di Yoast che cambiano tra versioni. Se Yoast
 * non c'è, restituiamo un fallback minimo basato sulle opzioni del sito.
 */
final class Seo
{
    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route(MA_CORE_REST_NS, '/seo', [
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => [$this, 'getSeo'],
            'args'                => [
                'id' => ['required' => false, 'type' => 'integer'],
            ],
        ]);
    }

    public function getSeo(\WP_REST_Request $request): \WP_REST_Response
    {
        $id = (int) ($request->get_param('id') ?? 0);

        // Nessun id esplicito: usiamo la home page statica se impostata.
        if ($id === 0 && get_option('show_on_front') === 'page') {
            $id = (int) get_option('page_on_front');
        }

        $seo = $this->fallback();

        $yoast = $id > 0 ? $this->yoastHeadJson($id) : null;
        if (is_array($yoast) && $yoast !== []) {
            // I valori Yoast hanno priorità sul fallback.
            $seo = array_merge($seo, $yoast);
        }

        return new \WP_REST_Response($seo, 200);
    }

    /**
     * Recupera yoast_head_json dalla REST core (pages, poi posts).
     *
     * @return array<string,mixed>|null
     */
    private function yoastHeadJson(int $id): ?array
    {
        foreach (['pages', 'posts'] as $base) {
            $req = new \WP_REST_Request('GET', '/wp/v2/' . $base . '/' . $id);
            $req->set_param('_fields', 'yoast_head_json');

            $res = rest_do_request($req);
            if ($res->is_error()) {
                continue;
            }

            $data = $res->get_data();
            if (is_array($data) && !empty($data['yoast_head_json']) && is_array($data['yoast_head_json'])) {
                return $data['yoast_head_json'];
            }
        }

        return null;
    }

    /**
     * SEO minima quando Yoast non è disponibile.
     *
     * @return array<string,mixed>
     */
    private function fallback(): array
    {
        $name        = get_bloginfo('name');
        $description = get_bloginfo('description');
        $url         = home_url('/');

        return [
            'title'          => $name,
            'description'    => $description,
            'canonical'      => $url,
            'og_locale'      => str_replace('-', '_', (string) get_bloginfo('language')),
            'og_type'        => 'website',
            'og_title'       => $name,
            'og_description' => $description,
            'og_url'         => $url,
            'og_site_name'   => $name,
        ];
    }
}
