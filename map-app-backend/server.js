require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

// Establish connection pool to NeonDB serverless cluster
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon secure SSL handshakes
});

// Retrieve our hidden security code from server environment properties
const ADMIN_SECRET = process.env.ADMIN_TOTP_SECRET;

/**
 * UTILITY SECURITY ENDPOINT: Generates a setup QR Code image string
 * Run this route once in your browser to scan it into your smartphone Google Authenticator app.
 * URL: https://onrender.com
 */
app.get('/api/v1/admin/setup-qr', (req, res) => {
    const otpauthUrl = `otpauth://totp/Explorer%20Pro%20Admin?secret=${ADMIN_SECRET}&issuer=MarineMapCorp`;
    qrcode.toDataURL(otpauthUrl, (err, dataUrl) => {
        if (err) return res.status(500).json({ error: "QR creation loop crash" });
        res.send(`<div style="text-align:center; padding:50px; font-family:sans-serif; background:#0F172A; color:white; min-height:100vh;"><h2>Scan this into Google Authenticator App:</h2><img src="${dataUrl}" style="margin-top:20px; border:10px solid white; border-radius:10px Pap;"/></div>`);
    });
});

/**
 * SECURITY GATE: Verify incoming code submission tokens
 */
app.post('/api/v1/admin/verify-login', (req, res) => {
    const { tokenCode } = req.body;

    const verified = speakeasy.totp.verify({
        secret: ADMIN_SECRET,
        encoding: 'base32',
        token: tokenCode,
        window: 1 // Allows 30 seconds of padding time flexibility for slow typing
    });

    if (verified) {
        res.status(200).json({ success: true, message: "Access tokens validated successfully." });
    } else {
        res.status(401).json({ success: false, error: "Invalid dynamic token passcode code submitted." });
    }
});

/**
 * PROTECTED OPERATIONS ENDPOINT: Reconfigured dashboard stats pull tool
 * Expects the 6-digit security token code passed directly inside request headers.
 */
app.get('/api/v1/admin/dashboard-stats', async (req, res) => {
    const headerToken = req.headers['x-admin-token'];

    const isAuthorized = speakeasy.totp.verify({
        secret: ADMIN_SECRET,
        encoding: 'base32',
        token: headerToken,
        window: 1
    });

    if (!isAuthorized) return res.status(403).json({ error: "Access Denied: Invalid Authentication." });

    try {
        const activeRes = await pool.query("SELECT COUNT(*) FROM users WHERE last_seen_online > NOW() - INTERVAL '10 minutes';");
        const proRes = await pool.query("SELECT COUNT(*) FROM users WHERE is_pro_user = true;");
        const listRes = await pool.query("SELECT user_id, is_pro_user, last_seen_online, created_at FROM users ORDER BY last_seen_online DESC;");

        const totalProCount = parseInt(proRes.rows[0].count || 0);

        res.status(200).json({
            activeUsersNow: parseInt(activeRes.rows[0].count || 0),
            proUsersCount: totalProCount,
            totalRevenue: totalProCount * 5,
            proCustomersList: listRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Metrics extraction failure" });
    }
});

/**
 * PROTECTED OPERATIONS ENDPOINT: Reconfigured PRO account status privileges toggle utility
 */
app.post('/api/v1/admin/toggle-pro', async (req, res) => {
    const headerToken = req.headers['x-admin-token'];
    const { targetUserId, makePro } = req.body;

    const isAuthorized = speakeasy.totp.verify({ secret: ADMIN_SECRET, encoding: 'base32', token: headerToken, window: 1 });
    if (!isAuthorized) return res.status(403).json({ error: "Access Denied: Unverified actions." });

    try {
        await pool.query("UPDATE users SET is_pro_user = $1, payment_status = $2 WHERE user_id = $3;", [makePro, makePro ? 'admin_granted' : 'unpaid', targetUserId]);
        res.status(200).json({ success: true, message: `User access permissions altered successfully.` });
    } catch (err) {
        res.status(500).json({ error: "Database mapping error." });
    }
});

/**
 * Endpoint C: Upload local device encrypted state packages
 */
app.post('/api/v1/sync/upload', async (req, res) => {
    const { userId, fileKey, lastUpdated, iv, payload } = req.body;

    if (!userId || !fileKey || !iv || !payload) {
        return res.status(400).json({ error: "Missing required tracking parameters." });
    }

    try {
        const queryText = `
            INSERT INTO sync_queue (user_id, file_key, last_updated, initialization_vector, encrypted_payload)
            VALUES ($1, $2, $3, $4, $5);
        `;
        await pool.query(queryText, [userId, fileKey, lastUpdated || Date.now(), iv, payload]);
        res.status(200).json({ success: true, message: "Encrypted payload held in transit cloud." });
    } catch (err) {
        console.error("❌ DB Upload Failure:", err);
        res.status(500).json({ error: "Database rejected transaction storage mapping." });
    }
});

/**
 * Endpoint D: FETCH & VAPORIZE PIPELINE
 * Hands down cloud changes to the phone, then completely deletes them from NeonDB.
 */
app.get('/api/v1/sync/fetch-and-wipe', async (req, res) => {
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(400).json({ error: "Missing identity confirmation header." });
    }

    try {
        // Begin strict atomic transaction block
        await pool.query('BEGIN');

        // 1. Gather all payloads waiting for this user profile
        const selectQuery = 'SELECT file_key, last_updated, initialization_vector, encrypted_payload FROM sync_queue WHERE user_id = $1;';
        const result = await pool.query(selectQuery, [userId]);

        // 2. Vaporize table entries immediately if payload items exist
        if (result.rows.length > 0) {
            const deleteQuery = 'DELETE FROM sync_queue WHERE user_id = $1;';
            await pool.query(deleteQuery, [userId]);
        }

        // Commit transaction safely
        await pool.query('COMMIT');

        res.status(200).json({
            message: "Sync complete. Cloud nodes wiped clean.",
            items: result.rows
        });

    } catch (error) {
        await pool.query('ROLLBACK'); // Abort structural changes if connection drops mid-flight
        console.error("❌ Core Sync Transaction Aborted:", error);
        res.status(500).json({ error: "Cloud sync operation fatal breakdown." });
    }
});

/**
 * Endpoint E: Ping to refresh active user tracking status timestamps
 */
app.post('/api/v1/user/heartbeat', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing user identification" });

    try {
        const queryText = `
            INSERT INTO users (user_id, last_seen_online) 
            VALUES ($1, NOW()) 
            ON CONFLICT (user_id) DO UPDATE SET last_seen_online = NOW();
        `;
        await pool.query(queryText, [userId]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Heartbeat logging breakdown" });
    }
});

// Serve static elements from public directory
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Locked Security Admin Node active."));
