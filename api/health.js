/**
 * Vercel Serverless Function: GET /api/health
 */
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
        status: "ok",
        platform: "Vercel Serverless",
        auth: "Configured via Vercel Environment Variables"
    });
};
