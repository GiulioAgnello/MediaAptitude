/**
 * cms-proxy — Cloudflare Worker (piano free)
 *
 * Scopo: esporre WordPress (su Aruba) come endpoint headless pubblico su
 * `cms.media-aptitude.it`, aggirando il redirect non-www -> www che Aruba
 * forza a livello server.
 *
 * Come: Aruba serve WP solo se riceve Host = www.media-aptitude.it. Il Worker
 * riscrive l'host della richiesta a `www` (cosi WP viene servito, niente 301)
 * e con `cf.resolveOverride` instrada la connessione sull'IP Aruba tramite il
 * record grigio `cms-origin.media-aptitude.it` (invece che su Cloudflare Pages,
 * che ospita il front-end www statico).
 *
 * Sostituisce l'Host Header Override delle Origin Rules (solo Enterprise).
 *
 * Prerequisiti DNS:
 *   - A `cms`        -> 89.46.104.50  PROXIED (arancione)  [ospita la route]
 *   - A `cms-origin` -> 89.46.104.50  DNS-only (grigio)    [target resolveOverride]
 * Route del Worker: cms.media-aptitude.it/*
 */

const ORIGIN_HOST = 'www.media-aptitude.it';        // Host inviato ad Aruba
const RESOLVE_TO = 'cms-origin.media-aptitude.it';  // record grigio -> IP Aruba

const ALLOWED_ORIGINS = [
  'https://www.media-aptitude.it',
  'https://media-aptitude.it',
  'https://mediaaptitude.pages.dev',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request) {
    // Preflight CORS per il POST /lead dal browser (runtime).
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Riscrive l'host a www: Aruba serve WP invece di redirigere.
    const url = new URL(request.url);
    url.hostname = ORIGIN_HOST;

    const originReq = new Request(url.toString(), request);

    // Instrada sull'IP Aruba (record grigio) tenendo Host = www.
    const upstream = await fetch(originReq, {
      cf: { resolveOverride: RESOLVE_TO },
    });

    // Ripropaga la risposta con header CORS per il front-end.
    const resp = new Response(upstream.body, upstream);
    const cors = corsHeaders(request);
    for (const [k, v] of Object.entries(cors)) resp.headers.set(k, v);
    return resp;
  },
};
