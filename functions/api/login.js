/**
 * Cloudflare Pages Function: POST /api/login
 */
import { authenticateUser } from './_store.js';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Username, X-User-Role',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    try {
        let body = {};
        try { body = await request.json(); } catch (e) {}

        const username = (body.username || '').trim();
        const password = (body.password || '').trim();

        if (!username || !password) {
            return new Response(JSON.stringify({ success: false, error: 'Username and password required' }), { status: 400, headers: corsHeaders });
        }

        const user = await authenticateUser(env, username, password);
        if (user) {
            return new Response(JSON.stringify({ success: true, user }), { status: 200, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid username or password' }), { status: 401, headers: corsHeaders });

    } catch (err) {
        console.error('Cloudflare Login Error:', err);
        return new Response(JSON.stringify({ success: false, error: 'Authentication server error' }), { status: 500, headers: corsHeaders });
    }
}
