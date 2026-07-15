<?php

declare(strict_types=1);

namespace MediaAptitude\Core;

use MediaAptitude\Core\Admin\MetaBoxes;
use MediaAptitude\Core\Deploy\DeployHook;
use MediaAptitude\Core\PostTypes\CaseStudy;
use MediaAptitude\Core\PostTypes\Lead;
use MediaAptitude\Core\PostTypes\PostType;
use MediaAptitude\Core\PostTypes\Service;
use MediaAptitude\Core\PostTypes\Stat;
use MediaAptitude\Core\PostTypes\TeamMember;
use MediaAptitude\Core\Rest\RestController;
use MediaAptitude\Core\Seo\Seo;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Orchestratore del plugin: tiene l'elenco dei CPT e collega i vari moduli
 * (admin, REST, SEO). Singleton semplice per avere un punto d'accesso unico.
 */
final class Plugin
{
    private static ?Plugin $instance = null;

    /** @var PostType[] */
    private array $postTypes = [];

    public static function instance(): Plugin
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    private function __construct()
    {
        // Ordine = ordine di apparizione nel menu admin.
        $this->postTypes = [
            new Service(),
            new CaseStudy(),
            new TeamMember(),
            new Stat(),
            new Lead(),
        ];
    }

    /**
     * Collega tutti gli hook. Chiamato su `plugins_loaded`.
     */
    public function boot(): void
    {
        add_action('init', [$this, 'registerPostTypes']);

        // Meta box per editare i campi custom senza ACF.
        (new MetaBoxes($this->postTypes))->register();

        // Endpoint REST custom.
        (new RestController($this->postTypes))->register();

        // Passthrough SEO (Yoast) + fallback.
        (new Seo())->register();

        // Auto-deploy: avvisa Cloudflare Pages quando i contenuti cambiano.
        // Attivo solo se MA_DEPLOY_HOOK_URL è definita in wp-config.php.
        (new DeployHook($this->postTypes))->register();
    }

    /**
     * Registra tutti i CPT. Usato sia su `init` sia in fase di attivazione
     * (per poter fare il flush dei rewrite con i CPT già noti).
     */
    public function registerPostTypes(): void
    {
        foreach ($this->postTypes as $postType) {
            $postType->register();
        }
    }

    /**
     * @return PostType[]
     */
    public function postTypes(): array
    {
        return $this->postTypes;
    }
}
