/**
 * Vercel Serverless Function: /api/users
 * Handles user listing, creation, role change, and password update on Vercel.
 */
const { getAllUsers, addUser, updateUserPassword, updateUserRole, updateUsername, deleteUser } = require('./store');

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

        const requesterRole = req.headers['x-user-role'] || 'user';

        // 1. GET /api/users -> List all users (excluding passwords)
        if (req.method === 'GET') {
            const users = await getAllUsers();
            const publicUsers = users.map(u => ({
                username: u.username,
                role: u.role || 'user',
                createdAt: u.createdAt || 'System'
            }));
            return res.status(200).json(publicUsers);
        }

        // 2. POST /api/users -> Create new user from webpage UI
        if (req.method === 'POST') {
            const { username, password, role } = body;

            if ((role === 'admin' || role === 'owner') && requesterRole !== 'owner') {
                return res.status(403).json({ error: 'Only Owner role can create Admin or Owner accounts' });
            }

            const result = await addUser({ username, password, role });
            if (result.success) {
                return res.status(201).json(result.user);
            } else {
                return res.status(400).json({ error: result.error });
            }
        }

        // 3. PUT /api/users -> Password reset, Role update, or Username update
        if (req.method === 'PUT') {
            const urlParts = (req.url || '').split('?')[0].split('/').filter(Boolean);
            // e.g. api/users/username/password, api/users/username/username, or api/users/username/role
            const targetUsername = urlParts[2] || body.username || body.targetUsername;
            const action = urlParts[3] || body.action;

            if (action === 'username' || body.newUsername) {
                const newUsername = body.newUsername;
                const result = await updateUsername(targetUsername, newUsername);
                if (result.success) return res.status(200).json(result);
                return res.status(400).json({ error: result.error });
            }

            if (action === 'password' || body.newPassword || body.password) {
                const newPassword = body.newPassword || body.password;
                const result = await updateUserPassword(targetUsername, newPassword);
                if (result.success) return res.status(200).json(result);
                return res.status(400).json({ error: result.error });
            }

            if (action === 'role' || body.newRole || body.role) {
                if (requesterRole !== 'owner') {
                    return res.status(403).json({ error: 'Only Owner role can convert account roles' });
                }
                const newRole = body.newRole || body.role;
                const result = await updateUserRole(targetUsername, newRole);
                if (result.success) return res.status(200).json(result);
                return res.status(400).json({ error: result.error });
            }

            return res.status(400).json({ error: 'Invalid update action' });
        }

        // 4. DELETE /api/users -> Delete user
        if (req.method === 'DELETE') {
            const urlParts = (req.url || '').split('?')[0].split('/').filter(Boolean);
            const targetUsername = urlParts[2] || body.username;

            const result = await deleteUser(targetUsername);
            if (result.success) return res.status(200).json(result);
            return res.status(400).json({ error: result.error });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('Vercel Users API Error:', err);
        return res.status(500).json({ error: 'Server error processing user request' });
    }
};
