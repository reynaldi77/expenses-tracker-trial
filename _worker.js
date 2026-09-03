/**
 * SpendWise Cloudflare Worker & Pages Universal Entrypoint
 * Handles /api/login, /api/users, /api/expenses, /api/debug, /api/health and serves static assets.
 */
import { 
    authenticateUser, 
    getAllUsers, 
    getEnvUsers, 
    addUser, 
    updateUserPassword, 
    updateUsername, 
    updateUserRole, 
    deleteUser, 
    getExpenses, 
    saveExpenses 
} from './functions/api/_store.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Username, X-User-Role',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 200, headers: corsHeaders });
        }

        // 1. GET /api/health
        if (path === '/api/health') {
            return new Response(JSON.stringify({ status: 'ok', platform: 'Cloudflare Worker', timestamp: new Date().toISOString() }), { status: 200, headers: corsHeaders });
        }

        // 2. GET /api/debug
        if (path === '/api/debug') {
            try {
                const envUsers = getEnvUsers(env);
                const allUsers = await getAllUsers(env);
                return new Response(JSON.stringify({
                    status: 'ok',
                    platform: 'Cloudflare Worker (_worker.js)',
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
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // 3. POST /api/login
        if (path === '/api/login') {
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

                const allUsers = await getAllUsers(env);
                const userExists = allUsers.some(u => (u.username || '').trim().toLowerCase() === username.toLowerCase());

                let debugMsg = 'Invalid username or password';
                if (!userExists) {
                    debugMsg += ` (User '${username}' not found in account directory. Active accounts: ${allUsers.map(u=>u.username).join(', ')})`;
                } else {
                    debugMsg += ` (Password mismatch for '${username}')`;
                }

                return new Response(JSON.stringify({ success: false, error: debugMsg }), { status: 401, headers: corsHeaders });
            } catch (err) {
                return new Response(JSON.stringify({ success: false, error: `Login error: ${err.message}` }), { status: 500, headers: corsHeaders });
            }
        }

        // 4. /api/users
        if (path.startsWith('/api/users')) {
            const urlParts = path.replace(/^\/api\/users\/?/, '').split('/').filter(Boolean);
            let body = {};
            try { body = await request.json(); } catch (e) {}
            const requesterRole = request.headers.get('x-user-role') || 'user';
            const targetUsername = urlParts[0] || body.username || body.targetUsername;
            const action = urlParts[1] || body.action;

            if (request.method === 'GET') {
                const users = await getAllUsers(env);
                const publicUsers = users.map(u => ({ username: u.username, role: u.role || 'user', createdAt: u.createdAt || 'System' }));
                return new Response(JSON.stringify(publicUsers), { status: 200, headers: corsHeaders });
            }
            if (request.method === 'POST') {
                const { username, password, role } = body;
                if ((role === 'admin' || role === 'owner') && requesterRole !== 'owner') {
                    return new Response(JSON.stringify({ error: 'Only Owner role can create Admin or Owner accounts' }), { status: 403, headers: corsHeaders });
                }
                const result = await addUser(env, { username, password, role });
                if (result.success) return new Response(JSON.stringify(result.user), { status: 201, headers: corsHeaders });
                return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
            }
            if (request.method === 'PUT') {
                if (action === 'username' || body.newUsername) {
                    const result = await updateUsername(env, targetUsername, body.newUsername);
                    if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
                    return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
                }
                if (action === 'password' || body.newPassword || body.password) {
                    const result = await updateUserPassword(env, targetUsername, body.newPassword || body.password);
                    if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
                    return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
                }
                if (action === 'role' || body.newRole || body.role) {
                    if (requesterRole !== 'owner') return new Response(JSON.stringify({ error: 'Only Owner role can convert account roles' }), { status: 403, headers: corsHeaders });
                    const result = await updateUserRole(env, targetUsername, body.newRole || body.role);
                    if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
                    return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
                }
                return new Response(JSON.stringify({ error: 'Invalid update action' }), { status: 400, headers: corsHeaders });
            }
            if (request.method === 'DELETE') {
                const result = await deleteUser(env, targetUsername);
                if (result.success) return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
                return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
            }
        }

        // 5. /api/expenses
        if (path.startsWith('/api/expenses')) {
            const urlParts = path.replace(/^\/api\/expenses\/?/, '').split('/').filter(Boolean);
            let body = {};
            try { body = await request.json(); } catch (e) {}
            const username = request.headers.get('x-username') || '';
            const role = request.headers.get('x-user-role') || 'user';
            const expId = urlParts[0] || body.id;

            let expenses = await getExpenses(env);

            if (request.method === 'GET') {
                if (role === 'admin' || role === 'owner' || !username) {
                    return new Response(JSON.stringify(expenses), { status: 200, headers: corsHeaders });
                }
                const filtered = expenses.filter(e => e.username === username);
                return new Response(JSON.stringify(filtered), { status: 200, headers: corsHeaders });
            }
            if (request.method === 'POST') {
                const newExp = {
                    id: body.id || `exp_cf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    username: body.username || username || 'mariahd',
                    datetime: body.datetime || new Date().toISOString(),
                    amount: parseFloat(body.amount) || 0,
                    category: body.category || 'Other',
                    paymentType: body.paymentType || 'Cashless',
                    comment: body.comment || '',
                    isReimbursed: Boolean(body.isReimbursed),
                    reimbursementStatus: body.reimbursementStatus || 'NONE',
                    reimbursedBy: body.reimbursedBy || '',
                    reimbursedAmount: parseFloat(body.reimbursedAmount) || 0,
                    reimbursementNotes: body.reimbursementNotes || '',
                    receipt: body.receipt || null,
                    createdAt: body.createdAt || new Date().toISOString()
                };
                expenses.unshift(newExp);
                await saveExpenses(env, expenses);
                return new Response(JSON.stringify(newExp), { status: 201, headers: corsHeaders });
            }
            if (request.method === 'PUT') {
                let updatedItem = null;
                expenses = expenses.map(item => {
                    if (item.id === expId) {
                        updatedItem = { ...item, ...body, amount: parseFloat(body.amount !== undefined ? body.amount : item.amount) || 0 };
                        return updatedItem;
                    }
                    return item;
                });
                await saveExpenses(env, expenses);
                return new Response(JSON.stringify(updatedItem || { success: true }), { status: 200, headers: corsHeaders });
            }
            if (request.method === 'DELETE') {
                expenses = expenses.filter(item => item.id !== expId);
                await saveExpenses(env, expenses);
                return new Response(JSON.stringify({ success: true, deleted_id: expId }), { status: 200, headers: corsHeaders });
            }
        }

        // Serve static asset via Cloudflare Workers Asset Binding
        if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
            return env.ASSETS.fetch(request);
        }

        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
    }
};
