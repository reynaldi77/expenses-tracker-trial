/**
 * Vercel Serverless Function: POST /api/login
 * Validates login credentials against Vercel Environment Variables AND webpage-created users.
 */
const { authenticateUser } = require('./store');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Username, X-User-Role');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                body = {};
            }
        }
        body = body || {};

        const username = (body.username || '').trim();
        const password = (body.password || '').trim();

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }

        // Authenticate against Vercel Store (Env Vars + Webpage Created Users)
        const user = await authenticateUser(username, password);

        if (user) {
            return res.status(200).json({
                success: true,
                user: {
                    username: user.username,
                    role: user.role || 'user'
                }
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });

    } catch (err) {
        console.error('Vercel Auth Error:', err);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed due to server error'
        });
    }
};
