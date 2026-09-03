/**
 * SpendWise Cloudflare Pages Functions Unified User & Expense Store
 * Supports Cloudflare Environment Variables, Supabase Postgres, Turso Serverless SQLite, Cloudflare KV, and Upstash Redis.
 */

// Helper: Parse Environment Variable users
export function getEnvUsers(env) {
    let envUsers = [];
    if (env.AUTH_USERS) {
        try {
            const parsed = typeof env.AUTH_USERS === 'string' ? JSON.parse(env.AUTH_USERS) : env.AUTH_USERS;
            if (Array.isArray(parsed)) envUsers = envUsers.concat(parsed);
        } catch (e) {}
    }
    if (env.ADMIN_USERNAME && env.ADMIN_PASSWORD) {
        envUsers.push({
            username: String(env.ADMIN_USERNAME).trim(),
            password: String(env.ADMIN_PASSWORD).trim(),
            role: env.ADMIN_ROLE || 'owner',
            createdAt: 'Cloudflare Env'
        });
    }
    if (env.USER_USERNAME && env.USER_PASSWORD) {
        envUsers.push({
            username: String(env.USER_USERNAME).trim(),
            password: String(env.USER_PASSWORD).trim(),
            role: env.USER_ROLE || 'user',
            createdAt: 'Cloudflare Env'
        });
    }
    return envUsers;
}

// Helper: Supabase PostgREST API Reader
export async function getSupabaseKV(env, keyName) {
    let url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    let key = env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return null;

    url = url.replace(/\/$/, '') + `/rest/v1/spendwise_kv?key=eq.${keyName}&select=value`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json'
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && data[0].value) {
                const parsed = JSON.parse(data[0].value);
                if (Array.isArray(parsed)) return parsed;
            }
        }
    } catch (e) {
        console.warn('Supabase fetch notice:', e);
    }
    return null;
}

// Helper: Supabase PostgREST API Writer
export async function saveSupabaseKV(env, keyName, jsonStr) {
    let url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    let key = env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return false;

    url = url.replace(/\/$/, '') + `/rest/v1/spendwise_kv`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify([{ key: keyName, value: jsonStr }])
        });
        return res.ok;
    } catch (e) {
        console.warn('Supabase save notice:', e);
    }
    return false;
}

// Helper: Execute SQL on Turso Serverless SQLite Database (if connected)
export async function queryTurso(env, sql, args = []) {
    let url = env.TURSO_DATABASE_URL || env.TURSO_URL || env.LIBSQL_URL || env.STORAGE_URL || env.STORAGE_DATABASE_URL;
    let token = env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN || env.LIBSQL_AUTH_TOKEN || env.STORAGE_AUTH_TOKEN || env.STORAGE_TOKEN || env.STORAGE_URL_TOKEN;

    if (!url || !token) return null;

    if (url.startsWith('libsql://')) {
        url = url.replace('libsql://', 'https://');
    }
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    url = url.replace(/\/$/, '') + '/v2/pipeline';

    const formattedArgs = args.map(arg => {
        if (arg === null || arg === undefined) return { type: 'null' };
        if (typeof arg === 'number') return { type: 'float', value: arg };
        return { type: 'text', value: String(arg) };
    });

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    { type: 'execute', stmt: { sql, args: formattedArgs } },
                    { type: 'close' }
                ]
            })
        });
        if (!res.ok) return null;
        const data = await res.json();
        const results = data.results ? data.results[0] : null;
        if (results && results.response && results.response.result) {
            return results.response.result;
        }
    } catch (e) {
        console.warn('Turso DB execution notice:', e);
    }
    return null;
}

// Helper: Read Dynamic Users (Supabase -> Turso -> Cloudflare KV -> Upstash Redis)
export async function getDynamicUsers(env) {
    // 1. Try Supabase Postgres REST API
    try {
        const sbResult = await getSupabaseKV(env, 'spendwise_users');
        if (Array.isArray(sbResult)) return sbResult;
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso(env, "CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        const tursoResult = await queryTurso(env, "SELECT value FROM spendwise_kv WHERE key = 'spendwise_users'");
        if (tursoResult && tursoResult.rows && tursoResult.rows.length > 0) {
            const rawVal = tursoResult.rows[0][0].value;
            if (rawVal) {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) return parsed;
            }
        }
    } catch (e) {}

    // 3. Try Cloudflare KV Namespace binding
    const cfKv = env.SPENDWISE_KV || env.KV;
    if (cfKv && typeof cfKv.get === 'function') {
        try {
            const raw = await cfKv.get('spendwise_users');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
    }

    // 4. Try Upstash Redis REST API
    const kvUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const kvToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
        try {
            const res = await fetch(`${kvUrl}/get/spendwise_users`, {
                headers: { Authorization: `Bearer ${kvToken}` }
            });
            const data = await res.json();
            if (data && data.result) {
                const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
    }

    return [];
}

// Helper: Save Dynamic Users
export async function saveDynamicUsers(env, usersList) {
    const jsonStr = JSON.stringify(usersList);

    // 1. Try Supabase Postgres REST API
    try {
        await saveSupabaseKV(env, 'spendwise_users', jsonStr);
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso(env, "CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        await queryTurso(env, "INSERT OR REPLACE INTO spendwise_kv (key, value) VALUES ('spendwise_users', ?)", [jsonStr]);
    } catch (e) {}

    // 3. Try Cloudflare KV Namespace binding
    const cfKv = env.SPENDWISE_KV || env.KV;
    if (cfKv && typeof cfKv.put === 'function') {
        try {
            await cfKv.put('spendwise_users', jsonStr);
        } catch (e) {}
    }

    // 4. Try Upstash Redis
    const kvUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const kvToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
        try {
            await fetch(`${kvUrl}/set/spendwise_users`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${kvToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonStr)
            });
        } catch (e) {}
    }
}

// Get All Merged Users (Env Users + Dynamic Users)
export async function getAllUsers(env) {
    const dynamicUsers = await getDynamicUsers(env);
    const envUsers = getEnvUsers(env);

    if (dynamicUsers && dynamicUsers.length > 0) {
        const userMap = new Map();
        envUsers.forEach(u => userMap.set(u.username, u));
        dynamicUsers.forEach(u => {
            userMap.set(u.username, u);
            if (u.originalUsername && u.originalUsername !== u.username) {
                userMap.delete(u.originalUsername);
            }
        });
        return Array.from(userMap.values());
    }

    return envUsers;
}

// Authenticate user by username and password
export async function authenticateUser(env, username, password) {
    const un = (username || '').trim();
    const pw = (password || '').trim();

    if (!un || !pw) return null;

    const all = await getAllUsers(env);
    const match = all.find(u => u.username === un && u.password === pw);
    if (match) {
        return { username: match.username, role: match.role || 'user' };
    }
    return null;
}

// Add New User
export async function addUser(env, userObj) {
    const un = (userObj.username || '').trim();
    const pw = (userObj.password || '').trim();
    const role = userObj.role || 'user';

    if (!un || !pw) return { success: false, error: 'Username and password required' };

    const all = await getAllUsers(env);
    if (all.some(u => u.username === un)) {
        return { success: false, error: `Username '${un}' already exists` };
    }

    const newUser = {
        username: un,
        password: pw,
        role: role,
        createdAt: new Date().toISOString()
    };

    all.push(newUser);
    await saveDynamicUsers(env, all);

    return { success: true, user: { username: un, role: role, createdAt: newUser.createdAt } };
}

// Update User Password
export async function updateUserPassword(env, username, newPassword) {
    const un = (username || '').trim();
    const pw = (newPassword || '').trim();
    if (!pw) return { success: false, error: 'New password required' };

    let allUsers = await getAllUsers(env);
    let found = false;

    allUsers = allUsers.map(u => {
        if (u.username === un) {
            found = true;
            return { ...u, password: pw };
        }
        return u;
    });

    if (found) {
        await saveDynamicUsers(env, allUsers);
        return { success: true, username: un };
    }

    return { success: false, error: 'User not found' };
}

// Update Username
export async function updateUsername(env, oldUsername, newUsername) {
    const cleanOld = (oldUsername || '').trim();
    const cleanNew = (newUsername || '').trim();

    if (!cleanNew) return { success: false, error: 'New username required' };
    if (cleanOld === cleanNew) return { success: true, username: cleanNew };

    let allUsers = await getAllUsers(env);
    if (allUsers.some(u => u.username.toLowerCase() === cleanNew.toLowerCase() && u.username !== cleanOld)) {
        return { success: false, error: `Username '${cleanNew}' is already taken` };
    }

    let found = false;
    allUsers = allUsers.map(u => {
        if (u.username === cleanOld) {
            found = true;
            return { ...u, username: cleanNew, originalUsername: u.originalUsername || cleanOld };
        }
        return u;
    });

    if (found) {
        await saveDynamicUsers(env, allUsers);
        return { success: true, oldUsername: cleanOld, newUsername: cleanNew };
    }

    return { success: false, error: 'User not found' };
}

// Update User Role
export async function updateUserRole(env, username, newRole) {
    const un = (username || '').trim();
    const role = (newRole || '').trim();

    let allUsers = await getAllUsers(env);
    let found = false;

    allUsers = allUsers.map(u => {
        if (u.username === un) {
            found = true;
            return { ...u, role };
        }
        return u;
    });

    if (found) {
        await saveDynamicUsers(env, allUsers);
        return { success: true, username: un, role };
    }

    return { success: false, error: 'User not found' };
}

// Delete User
export async function deleteUser(env, username) {
    const un = (username || '').trim();
    let allUsers = await getAllUsers(env);
    const initialLen = allUsers.length;
    allUsers = allUsers.filter(u => u.username !== un);

    if (allUsers.length !== initialLen) {
        await saveDynamicUsers(env, allUsers);
        return { success: true, deleted_user: un };
    }
    return { success: false, error: 'User not found' };
}

// Expenses CRUD for Cloudflare
export async function getExpenses(env) {
    // 1. Try Supabase Postgres REST API
    try {
        const sbResult = await getSupabaseKV(env, 'spendwise_expenses');
        if (Array.isArray(sbResult)) return sbResult;
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso(env, "CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        const tursoResult = await queryTurso(env, "SELECT value FROM spendwise_kv WHERE key = 'spendwise_expenses'");
        if (tursoResult && tursoResult.rows && tursoResult.rows.length > 0) {
            const rawVal = tursoResult.rows[0][0].value;
            if (rawVal) {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) return parsed;
            }
        }
    } catch (e) {}

    // 3. Try Cloudflare KV Namespace binding
    const cfKv = env.SPENDWISE_KV || env.KV;
    if (cfKv && typeof cfKv.get === 'function') {
        try {
            const raw = await cfKv.get('spendwise_expenses');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
    }

    // 4. Try Upstash Redis
    const kvUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const kvToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

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

    return [];
}

export async function saveExpenses(env, list) {
    const jsonStr = JSON.stringify(list);

    // 1. Try Supabase Postgres REST API
    try {
        await saveSupabaseKV(env, 'spendwise_expenses', jsonStr);
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso(env, "CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        await queryTurso(env, "INSERT OR REPLACE INTO spendwise_kv (key, value) VALUES ('spendwise_expenses', ?)", [jsonStr]);
    } catch (e) {}

    // 3. Try Cloudflare KV Namespace binding
    const cfKv = env.SPENDWISE_KV || env.KV;
    if (cfKv && typeof cfKv.put === 'function') {
        try {
            await cfKv.put('spendwise_expenses', jsonStr);
        } catch (e) {}
    }

    // 4. Try Upstash Redis
    const kvUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const kvToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

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
}
