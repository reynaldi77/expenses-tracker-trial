/**
 * SpendWise Vercel Serverless Unified User & Expense Store
 * Supports Vercel Environment Variables + Supabase Postgres + Turso SQLite + Vercel KV / Upstash Redis
 */
const fs = require('fs');

const TMP_FILE = '/tmp/spendwise_dynamic_users.json';

// Helper: Parse Vercel Environment Variable users
function getEnvUsers() {
    let envUsers = [];
    if (process.env.AUTH_USERS) {
        try {
            const parsed = JSON.parse(process.env.AUTH_USERS);
            if (Array.isArray(parsed)) envUsers = envUsers.concat(parsed);
        } catch (e) {}
    }
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
        envUsers.push({
            username: process.env.ADMIN_USERNAME.trim(),
            password: process.env.ADMIN_PASSWORD.trim(),
            role: process.env.ADMIN_ROLE || 'owner',
            createdAt: 'Vercel Env'
        });
    }
    if (process.env.USER_USERNAME && process.env.USER_PASSWORD) {
        envUsers.push({
            username: process.env.USER_USERNAME.trim(),
            password: process.env.USER_PASSWORD.trim(),
            role: process.env.USER_ROLE || 'user',
            createdAt: 'Vercel Env'
        });
    }

    if (envUsers.length === 0) {
        envUsers = [
            { username: 'reynaldiw', password: 'tracker07', role: 'owner', createdAt: 'Default' },
            { username: 'mariahd', password: 'loveyou', role: 'user', createdAt: 'Default' }
        ];
    }

    return envUsers;
}

// Helper: Supabase PostgREST API Reader
async function getSupabaseKV(keyName, env = process.env) {
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
async function saveSupabaseKV(keyName, jsonStr, env = process.env) {
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
async function queryTurso(sql, args = []) {
    let url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.LIBSQL_URL || process.env.STORAGE_URL || process.env.STORAGE_DATABASE_URL;
    let token = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || process.env.LIBSQL_AUTH_TOKEN || process.env.STORAGE_AUTH_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_URL_TOKEN;

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

// Helper: Read Dynamic Vercel Users (Supabase -> Turso -> Vercel KV / Upstash -> File)
async function getDynamicUsers() {
    // 1. Try Supabase Postgres REST API
    try {
        const sbResult = await getSupabaseKV('spendwise_users');
        if (Array.isArray(sbResult)) return sbResult;
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso("CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        const tursoResult = await queryTurso("SELECT value FROM spendwise_kv WHERE key = 'spendwise_users'");
        if (tursoResult && tursoResult.rows && tursoResult.rows.length > 0) {
            const rawVal = tursoResult.rows[0][0].value;
            if (rawVal) {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) return parsed;
            }
        }
    } catch (e) {}

    // 3. Try Vercel KV / Upstash Redis if configured
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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

    // 4. Fallback to /tmp store
    try {
        if (fs.existsSync(TMP_FILE)) {
            const content = fs.readFileSync(TMP_FILE, 'utf8');
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}

    return [];
}

// Helper: Save Dynamic Vercel Users
async function saveDynamicUsers(usersList) {
    const jsonStr = JSON.stringify(usersList);

    // 1. Try Supabase Postgres REST API
    try {
        await saveSupabaseKV('spendwise_users', jsonStr);
    } catch (e) {}

    // 2. Try Turso Serverless SQLite DB
    try {
        await queryTurso("CREATE TABLE IF NOT EXISTS spendwise_kv (key TEXT PRIMARY KEY, value TEXT)");
        await queryTurso("INSERT OR REPLACE INTO spendwise_kv (key, value) VALUES ('spendwise_users', ?)", [jsonStr]);
    } catch (e) {}

    // 3. Try Vercel KV / Upstash Redis
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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

    // 4. Save to /tmp
    try {
        fs.writeFileSync(TMP_FILE, JSON.stringify(usersList, null, 2), 'utf8');
    } catch (e) {}
}

// Get All Merged Users (Env Users + Webpage Created Users)
async function getAllUsers() {
    const dynamicUsers = await getDynamicUsers();
    const envUsers = getEnvUsers();

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
async function authenticateUser(username, password) {
    const un = (username || '').trim();
    const pw = (password || '').trim();

    if (!un || !pw) return null;

    const all = await getAllUsers();
    const match = all.find(u => u.username === un && u.password === pw);
    if (match) {
        return { username: match.username, role: match.role || 'user' };
    }
    return null;
}

// Add New User (Created by Owner from Webpage)
async function addUser(userObj) {
    const un = (userObj.username || '').trim();
    const pw = (userObj.password || '').trim();
    const role = userObj.role || 'user';

    if (!un || !pw) return { success: false, error: 'Username and password required' };

    const all = await getAllUsers();
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
    await saveDynamicUsers(all);

    return { success: true, user: { username: un, role: role, createdAt: newUser.createdAt } };
}

// Update User Password
async function updateUserPassword(username, newPassword) {
    const un = (username || '').trim();
    const pw = (newPassword || '').trim();
    if (!pw) return { success: false, error: 'New password required' };

    let allUsers = await getAllUsers();
    let found = false;

    allUsers = allUsers.map(u => {
        if (u.username === un) {
            found = true;
            return { ...u, password: pw };
        }
        return u;
    });

    if (found) {
        await saveDynamicUsers(allUsers);
        return { success: true, username: un };
    }

    return { success: false, error: 'User not found' };
}

// Update Username
async function updateUsername(oldUsername, newUsername) {
    const cleanOld = (oldUsername || '').trim();
    const cleanNew = (newUsername || '').trim();

    if (!cleanNew) return { success: false, error: 'New username required' };
    if (cleanOld === cleanNew) return { success: true, username: cleanNew };

    let allUsers = await getAllUsers();
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
        await saveDynamicUsers(allUsers);
        return { success: true, oldUsername: cleanOld, newUsername: cleanNew };
    }

    return { success: false, error: 'User not found' };
}

// Update User Role
async function updateUserRole(username, newRole) {
    const un = (username || '').trim();
    const role = (newRole || '').trim();

    let allUsers = await getAllUsers();
    let found = false;

    allUsers = allUsers.map(u => {
        if (u.username === un) {
            found = true;
            return { ...u, role };
        }
        return u;
    });

    if (found) {
        await saveDynamicUsers(allUsers);
        return { success: true, username: un, role };
    }

    return { success: false, error: 'User not found' };
}

// Delete User
async function deleteUser(username) {
    const un = (username || '').trim();
    let allUsers = await getAllUsers();
    const initialLen = allUsers.length;
    allUsers = allUsers.filter(u => u.username !== un);

    if (allUsers.length !== initialLen) {
        await saveDynamicUsers(allUsers);
        return { success: true, deleted_user: un };
    }
    return { success: false, error: 'User not found' };
}

module.exports = {
    getAllUsers,
    authenticateUser,
    addUser,
    updateUserPassword,
    updateUserRole,
    updateUsername,
    deleteUser,
    queryTurso,
    getSupabaseKV,
    saveSupabaseKV
};
