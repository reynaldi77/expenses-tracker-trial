/**
 * Cloudflare Pages Function: GET /api/debug
 * Diagnostic endpoint to check environment variables and user resolution safely (no plain passwords shown).
 */
import { getAllUsers, getEnvUsers } from './_store.js';

export async function onRequest(context) {
    const { env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        const envUsers = getEnvUsers(env);
        const allUsers = await getAllUsers(env);

        return new Response(JSON.stringify({
            status: 'ok',
            has_SUPABASE_URL: Boolean(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL),
            has_SUPABASE_KEY: Boolean(env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY),
            has_USER_USERNAME: Boolean(env.USER_USERNAME),
            has_USER_PASSWORD: Boolean(env.USER_PASSWORD),
            has_ADMIN_USERNAME: Boolean(env.ADMIN_USERNAME),
            has_ADMIN_PASSWORD: Boolean(env.ADMIN_PASSWORD),
            envUsersCount: envUsers.length,
            allUsersCount: allUsers.length,
            userList: allUsers.map(u => ({ username: u.username, role: u.role, createdAt: u.createdAt || 'Unknown' }))
        }), { status: 200, headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: corsHeaders });
    }
}
