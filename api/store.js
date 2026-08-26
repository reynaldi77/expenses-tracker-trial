/**
 * SpendWise Vercel Serverless Unified User & Expense Store
 * Combines Vercel Environment Variables + Dynamic Vercel Storage (Vercel KV / Upstash Redis / Serverless Store)
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
    return envUsers;
}

// Helper: Read Dynamic Vercel Users
async function getDynamicUsers() {
    // 1. Try Vercel KV / Upstash Redis if configured in Vercel project
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
        } catch (e) {
            console.warn('Vercel KV fetch failed, falling back to temp store', e);
        }
    }

    // 2. Fallback to /tmp store
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
    // 1. Try Vercel KV / Upstash Redis
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
                body: JSON.stringify(JSON.stringify(usersList))
            });
        } catch (e) {
            console.warn('Vercel KV save failed', e);
        }
    }

    // 2. Save to /tmp
    try {
        fs.writeFileSync(TMP_FILE, JSON.stringify(usersList, null, 2), 'utf8');
    } catch (e) {}
}

// Get All Merged Users (Env Users + Webpage Created Users)
async function getAllUsers() {
    const envUsers = getEnvUsers();
    const dynamicUsers = await getDynamicUsers();

    const userMap = new Map();
    // Load env users first
    envUsers.forEach(u => userMap.set(u.username, u));
    // Dynamic users take precedence or add new accounts created by owner from webpage
    dynamicUsers.forEach(u => userMap.set(u.username, u));

    return Array.from(userMap.values());
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

    const dynamicUsers = await getDynamicUsers();
    const newUser = {
        username: un,
        password: pw,
        role: role,
        createdAt: new Date().toISOString()
    };

    dynamicUsers.push(newUser);
    await saveDynamicUsers(dynamicUsers);

    return { success: true, user: { username: un, role: role, createdAt: newUser.createdAt } };
}

// Update User Password
async function updateUserPassword(username, newPassword) {
    const un = (username || '').trim();
    const pw = (newPassword || '').trim();
    if (!pw) return { success: false, error: 'New password required' };

    const dynamicUsers = await getDynamicUsers();
    let found = false;

    const updated = dynamicUsers.map(u => {
        if (u.username === un) {
            found = true;
            return { ...u, password: pw };
        }
        return u;
    });

    if (!found) {
        const envUsers = getEnvUsers();
        const envUser = envUsers.find(u => u.username === un);
        if (envUser) {
            updated.push({ ...envUser, password: pw });
            found = true;
        }
    }

    if (found) {
        await saveDynamicUsers(updated);
        return { success: true, username: un };
    }

    return { success: false, error: 'User not found' };
}

// Update User Role
async function updateUserRole(username, newRole) {
    const un = (username || '').trim();
    const role = (newRole || '').trim();

    const dynamicUsers = await getDynamicUsers();
    let found = false;

    const updated = dynamicUsers.map(u => {
        if (u.username === un) {
            found = true;
            return { ...u, role };
        }
        return u;
    });

    if (!found) {
        const envUsers = getEnvUsers();
        const envUser = envUsers.find(u => u.username === un);
        if (envUser) {
            updated.push({ ...envUser, role });
            found = true;
        }
    }

    if (found) {
        await saveDynamicUsers(updated);
        return { success: true, username: un, role };
    }

    return { success: false, error: 'User not found' };
}

// Delete User
async function deleteUser(username) {
    const un = (username || '').trim();
    let dynamicUsers = await getDynamicUsers();
    const initialLen = dynamicUsers.length;
    dynamicUsers = dynamicUsers.filter(u => u.username !== un);

    if (dynamicUsers.length !== initialLen) {
        await saveDynamicUsers(dynamicUsers);
        return { success: true, deleted_user: un };
    }
    return { success: false, error: 'User not found or cannot delete env user' };
}

module.exports = {
    getAllUsers,
    authenticateUser,
    addUser,
    updateUserPassword,
    updateUserRole,
    deleteUser
};
