/**
 * Cloudflare Pages Function: /api/users and subpaths
 */
import { getAllUsers, addUser, updateUserPassword, updateUserRole, updateUsername, deleteUser } from '../_store.js';

export async function onRequest(context) {
    const { request, env, params } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Username, X-User-Role',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        let body = {};
        try { body = await request.json(); } catch (e) {}

        const requesterRole = request.headers.get('x-user-role') || 'user';
        const urlParts = params.path || []; // array of path segments after /api/users/
        const targetUsername = urlParts[0] || body.username || body.targetUsername;
        const action = urlParts[1] || body.action;

        // 1. GET /api/users -> List all users (excluding passwords)
        if (request.method === 'GET') {
            const users = await getAllUsers(env);
            const publicUsers = users.map(u => ({
                username: u.username,
                role: u.role || 'user',
                createdAt: u.createdAt || 'System'
            }));
            return new Response(JSON.stringify(publicUsers), { status: 200, headers: corsHeaders });
        }

        // 2. POST /api/users -> Add User
        if (request.method === 'POST') {
            const { username, password, role } = body;
            if ((role === 'admin' || role === 'owner') && requesterRole !== 'owner') {
                return new Response(JSON.stringify({ error: 'Only Owner role can create Admin or Owner accounts' }), { status: 403, headers: corsHeaders });
            }

            const result = await addUser(env, { username, password, role });
            if (result.success) {
                return new Response(JSON.stringify(result.user), { status: 201, headers: corsHeaders });
            }
            return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
        }

        // 3. PUT /api/users -> Password reset, Role update, or Username update
        if (request.method === 'PUT') {
            if (action === 'username' || body.newUsername) {
                const newUsername = body.newUsername;
                const result = await updateUsername(env, targetUsername, newUsername);
                if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
                return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
            }

            if (action === 'password' || body.newPassword || body.password) {
                const newPassword = body.newPassword || body.password;
                const result = await updateUserPassword(env, targetUsername, newPassword);
                if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
                return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
            }

            if (action === 'role' || body.newRole || body.role) {
                if (requesterRole !== 'owner') {
                    return new Response(JSON.stringify({ error: 'Only Owner role can convert account roles' }), { status: 403, headers: corsHeaders });
                }
                const newRole = body.newRole || body.role;
                const result = await updateUserRole(env, targetUsername, newRole);
                if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
                return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
            }

            return new Response(JSON.stringify({ error: 'Invalid update action' }), { status: 400, headers: corsHeaders });
        }

        // 4. DELETE /api/users -> Delete user
        if (request.method === 'DELETE') {
            const result = await deleteUser(env, targetUsername);
            if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
            return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });

    } catch (err) {
        console.error('Cloudflare Users API Error:', err);
        return new Response(JSON.stringify({ error: 'Server error processing user request' }), { status: 500, headers: corsHeaders });
    }
}
