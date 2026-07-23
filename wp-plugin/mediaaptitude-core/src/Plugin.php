<?php

declare(strict_types=1);

namespace MediaAptitude\Core;

use MediaAptitude\Core\Admin\MetaBoxes;
use MediaAptitude\Core\Admin\Settings;
use MediaAptitude\Core\Deploy\DeployHook;
use MediaAptitude\Core\PostTypes\CaseStudy;
use MediaAptitude\Core\PostTypes\Lead;
use MediaAptitude\Core\PostTypes\PostType;
use MediaAptitude\Core\PostTypes\Service;
use MediaAptitude\Core\PostTypes\ServiceGroup;
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
            new ServiceGroup(),
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

        // Ogni modulo è caricato in modo isolato: se uno fallisce (file mancante,
        // errore di parsing dopo un upload incompleto…) NON deve mandare in crash
        // tutto wp-admin. Il resto del plugin continua a funzionare e in admin
        // compare un avviso con l'errore preciso.
        $this->safeRegister('MetaBoxes', fn () => (new MetaBoxes($this->postTypes))->register());
        $this->safeRegister('Settings', fn () => (new Settings())->register());
        $this->safeRegister('RestController', fn () => (new RestController($this->postTypes))->register());
        $this->safeRegister('Seo', fn () => (new Seo())->register());
        $this->safeRegister('DeployHook', fn () => (new DeployHook($this->postTypes))->register());
    }

    /**
     * Esegue la registrazione di un modulo intercettando qualsiasi errore
     * (incluso Class-not-found o ParseError di un file appena caricato male),
     * così un singolo modulo rotto non blocca l'intero pannello.
     */
    private function safeRegister(string $label, callable $register): void
    {
        try {
            $register();
        } catch (\Throwable $e) {
            $message = sprintf('[mediaaptitude-core] modulo "%s" non caricato: %s', $label, $e->getMessage());
            error_log($message);
            add_action('admin_notices', static function () use ($label, $e): void {
                printf(
                    '<div class="notice notice-error"><p><strong>Media Aptitude — Core:</strong> il modulo <code>%s</code> non è stato caricato: %s</p></div>',
                    esc_html($label),
                    esc_html($e->getMessage())
                );
            });
        }
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
