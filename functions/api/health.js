/**
 * Cloudflare Pages Function: GET /api/health
 */
export async function onRequest() {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    return new Response(JSON.stringify({
        status: 'ok',
        platform: 'Cloudflare Pages Functions',
        timestamp: new Date().toISOString()
    }), { status: 200, headers: corsHeaders });
}
