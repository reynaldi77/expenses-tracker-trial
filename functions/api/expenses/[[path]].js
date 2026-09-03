/**
 * Cloudflare Pages Function: /api/expenses and subpaths
 */
import { getExpenses, saveExpenses } from '../_store.js';

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

        const username = request.headers.get('x-username') || '';
        const role = request.headers.get('x-user-role') || 'user';
        const urlParts = params.path || [];
        const expId = urlParts[0] || body.id;

        let expenses = await getExpenses(env);

        // 1. GET /api/expenses
        if (request.method === 'GET') {
            if (role === 'admin' || role === 'owner' || !username) {
                return new Response(JSON.stringify(expenses), { status: 200, headers: corsHeaders });
            }
            const filtered = expenses.filter(e => e.username === username);
            return new Response(JSON.stringify(filtered), { status: 200, headers: corsHeaders });
        }

        // 2. POST /api/expenses
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

        // 3. PUT /api/expenses/:id
        if (request.method === 'PUT') {
            let updatedItem = null;
            expenses = expenses.map(item => {
                if (item.id === expId) {
                    updatedItem = {
                        ...item,
                        ...body,
                        amount: parseFloat(body.amount !== undefined ? body.amount : item.amount) || 0
                    };
                    return updatedItem;
                }
                return item;
            });

            await saveExpenses(env, expenses);
            return new Response(JSON.stringify(updatedItem || { success: true }), { status: 200, headers: corsHeaders });
        }

        // 4. DELETE /api/expenses/:id
        if (request.method === 'DELETE') {
            expenses = expenses.filter(item => item.id !== expId);
            await saveExpenses(env, expenses);
            return new Response(JSON.stringify({ success: true, deleted_id: expId }), { status: 200, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });

    } catch (err) {
        console.error('Cloudflare Expenses API Error:', err);
        return new Response(JSON.stringify({ error: 'Server error processing expenses request' }), { status: 500, headers: corsHeaders });
    }
}
