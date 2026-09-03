/**
 * Vercel Serverless Function: /api/expenses
 * Handles expense CRUD persistence on Vercel (supporting Supabase Postgres, Turso SQLite, Vercel KV / Upstash Redis, and file fallback)
 */
const fs = require('fs');
const { queryTurso, getSupabaseKV, saveSupabaseKV } = require('./store');

const TMP_EXPENSES = '/tmp/spendwise_dynamic_expenses.json';

async function getExpenses() {
    // 1. Try Supabase Postgres REST API
    try {
        const sbResult = await getSupabaseKV('spendwise_expenses');
        if (Array.isArray(sbResult)) return sbResult;
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso("CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        const tursoResult = await queryTurso("SELECT value FROM spendwise_kv WHERE key = 'spendwise_expenses'");
        if (tursoResult && tursoResult.rows && tursoResult.rows.length > 0) {
            const rawVal = tursoResult.rows[0][0].value;
            if (rawVal) {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) return parsed;
            }
        }
    } catch (e) {}

    // 3. Try Vercel KV / Upstash Redis
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (kvUrl && kvToken) {
        try {
            const res = await fetch(`${kvUrl}/get/spendwise_expenses`, {
                headers: { Authorization: `Bearer ${kvToken}` }
            });
            const data = await res.json();
            if (data && data.result) {
                const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
    }

    // 4. Fallback to /tmp
    try {
        if (fs.existsSync(TMP_EXPENSES)) {
            const parsed = JSON.parse(fs.readFileSync(TMP_EXPENSES, 'utf8'));
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}

    return [];
}

async function saveExpenses(list) {
    const jsonStr = JSON.stringify(list);

    // 1. Try Supabase Postgres REST API
    try {
        await saveSupabaseKV('spendwise_expenses', jsonStr);
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso("CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        await queryTurso("INSERT OR REPLACE INTO spendwise_kv (key, value) VALUES ('spendwise_expenses', ?)", [jsonStr]);
    } catch (e) {}

    // 3. Try Vercel KV / Upstash Redis
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (kvUrl && kvToken) {
        try {
            await fetch(`${kvUrl}/set/spendwise_expenses`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${kvToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonStr)
            });
        } catch (e) {}
    }

    // 4. Save to /tmp
    try {
        fs.writeFileSync(TMP_EXPENSES, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {}
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Username, X-User-Role');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }
        body = body || {};

        const username = req.headers['x-username'] || '';
        const role = req.headers['x-user-role'] || 'user';

        let expenses = await getExpenses();

        // 1. GET /api/expenses
        if (req.method === 'GET') {
            if (role === 'admin' || role === 'owner' || !username) {
                return res.status(200).json(expenses);
            }
            const filtered = expenses.filter(e => e.username === username);
            return res.status(200).json(filtered);
        }

        // 2. POST /api/expenses -> Add Expense
        if (req.method === 'POST') {
            const newExp = {
                id: body.id || `exp_vcl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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
            await saveExpenses(expenses);
            return res.status(201).json(newExp);
        }

        // 3. PUT /api/expenses -> Update Expense
        if (req.method === 'PUT') {
            const urlParts = (req.url || '').split('?')[0].split('/').filter(Boolean);
            const expId = urlParts[2] || body.id;

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

            await saveExpenses(expenses);
            return res.status(200).json(updatedItem || { success: true });
        }

        // 4. DELETE /api/expenses -> Delete Expense
        if (req.method === 'DELETE') {
            const urlParts = (req.url || '').split('?')[0].split('/').filter(Boolean);
            const expId = urlParts[2] || body.id;

            expenses = expenses.filter(item => item.id !== expId);
            await saveExpenses(expenses);
            return res.status(200).json({ success: true, deleted_id: expId });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('Vercel Expenses API Error:', err);
        return res.status(500).json({ error: 'Server error processing expenses request' });
    }
};
