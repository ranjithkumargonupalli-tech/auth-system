const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Added CORS
const { sql, pool, poolConnect } = require('./database');
const { sendWelcomeEmail, sendPasswordChangeNotification, sendAdminAlert, sendOtpEmail } = require('./utils/emailService');

const app = express();

// ==================== CORS CONFIGURATION ====================
// Allow requests from your GitHub Pages frontend
app.use(cors({
    origin: 'https://ranjithkumargonupalli-tech.github.io', // Replace with your actual frontend domain
    credentials: true // Allow cookies/session
}));

// ==================== MULTER CONFIG (Avatar Upload) ====================
// Note: On Render, uploaded files are temporary and may be lost on restart.
// For production, consider using cloud storage (e.g., Cloudinary, AWS S3).
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads/avatars';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + req.session.userId + '-' + unique + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// ==================== OTP STORAGE ====================
const otpStore = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of otpStore.entries()) {
        if (data.expires < now) {
            otpStore.delete(email);
        }
    }
}, 10 * 60 * 1000);

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration – secret from environment variable
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secret-key-change-this', // Use env var in production
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        sameSite: 'lax'
    }
}));

// ==================== AUTH MIDDLEWARE ====================
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

const isAdmin = async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    try {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, req.session.userId)
            .query('SELECT role FROM users WHERE id = @id');
        if (result.recordset.length === 0 || result.recordset[0].role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ==================== PUBLIC ROUTES ====================

// Request OTP
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).send('Email is required');
    try {
        await poolConnect;
        const check = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM users WHERE email = @email');
        if (check.recordset.length > 0) {
            return res.status(409).send('Email already registered');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000;
        otpStore.set(email, { otp, expires });
        const emailSent = await sendOtpEmail(email, otp);
        if (!emailSent.success) {
            return res.status(500).send('Failed to send OTP email');
        }
        res.status(200).send('OTP sent successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Register with OTP
app.post('/register', async (req, res) => {
    const { username, email, password, otp } = req.body;
    if (!username || !email || !password || !otp) {
        return res.status(400).send('All fields (including OTP) are required');
    }
    const storedOtpData = otpStore.get(email);
    if (!storedOtpData) {
        return res.status(400).send('No OTP requested or OTP expired. Please request a new OTP.');
    }
    if (storedOtpData.expires < Date.now()) {
        otpStore.delete(email);
        return res.status(400).send('OTP expired. Please request a new one.');
    }
    if (storedOtpData.otp !== otp) {
        return res.status(400).send('Invalid OTP');
    }
    try {
        await poolConnect;
        const check = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM users WHERE email = @email');
        if (check.recordset.length > 0) {
            return res.status(409).send('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .query('INSERT INTO users (username, email, password) OUTPUT INSERTED.id VALUES (@username, @email, @password)');
        const newUserId = result.recordset[0].id;
        otpStore.delete(email);
        req.session.userId = newUserId;
        req.session.username = username;
        req.session.email = email;
        sendWelcomeEmail(email, username).catch(err => console.error('Welcome email failed:', err.message));
        sendAdminAlert({ username, email }).catch(err => console.error('Admin alert failed:', err.message));
        res.status(201).send('Registration successful');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send('Username and password required');
    try {
        await poolConnect;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM users WHERE username = @username');
        if (result.recordset.length === 0) return res.status(401).send('Invalid username or password');
        const user = result.recordset[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).send('Invalid username or password');
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;
        res.send('Login successful');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logged out');
});

// Check session
app.get('/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// ==================== USER ROUTES (Authenticated) ====================

// Get current user profile (basic)
app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, req.session.userId)
            .query('SELECT id, username, email, role FROM users WHERE id = @id');
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get full profile (with all new fields)
app.get('/profile/full', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, req.session.userId)
            .query(`
                SELECT id, username, display_name, email, bio, phone,
                       github, twitter, linkedin, email_verified,
                       two_factor_enabled, created_at, updated_at,
                       avatar_url
                FROM users WHERE id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update profile (text fields)
app.put('/profile/update', isAuthenticated, async (req, res) => {
    const { display_name, bio, phone, github, twitter, linkedin } = req.body;
    try {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, req.session.userId)
            .input('display_name', sql.NVarChar, display_name || null)
            .input('bio', sql.NVarChar, bio || null)
            .input('phone', sql.NVarChar, phone || null)
            .input('github', sql.NVarChar, github || null)
            .input('twitter', sql.NVarChar, twitter || null)
            .input('linkedin', sql.NVarChar, linkedin || null)
            .query(`
                UPDATE users SET
                    display_name = @display_name,
                    bio = @bio,
                    phone = @phone,
                    github = @github,
                    twitter = @twitter,
                    linkedin = @linkedin,
                    updated_at = GETDATE()
                WHERE id = @id
            `);
        res.send('Profile updated successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Upload avatar
app.post('/profile/avatar', isAuthenticated, upload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    try {
        const avatarUrl = '/uploads/avatars/' + req.file.filename;
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, req.session.userId)
            .input('avatar_url', sql.NVarChar, avatarUrl)
            .query('UPDATE users SET avatar_url = @avatar_url WHERE id = @id');
        res.send('Avatar uploaded successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Change password
app.put('/profile/password', isAuthenticated, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).send('All fields required');
    try {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, req.session.userId)
            .query('SELECT password FROM users WHERE id = @id');
        const user = result.recordset[0];
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(401).send('Current password incorrect');
        const hashedNew = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input('id', sql.Int, req.session.userId)
            .input('newPassword', sql.NVarChar, hashedNew)
            .query('UPDATE users SET password = @newPassword WHERE id = @id');
        if (req.session.email) {
            sendPasswordChangeNotification(req.session.email, req.session.username)
                .catch(err => console.error('Password change email failed:', err.message));
        }
        res.send('Password changed');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Toggle two-factor (placeholder)
app.post('/profile/toggle-2fa', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, req.session.userId)
            .query('UPDATE users SET two_factor_enabled = ~two_factor_enabled WHERE id = @id');
        res.send('2FA setting toggled');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Delete own account
app.delete('/profile/delete', isAuthenticated, async (req, res) => {
    try {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, req.session.userId)
            .query('DELETE FROM users WHERE id = @id');
        req.session.destroy();
        res.send('Account deleted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// ==================== ADMIN ROUTES ====================
app.get('/admin/users', isAdmin, async (req, res) => {
    try {
        await poolConnect;
        const result = await pool.request()
            .query('SELECT id, username, email, role, created_at, password FROM users ORDER BY id');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/admin/users/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    if (userId == req.session.userId) return res.status(400).send('Cannot delete yourself');
    try {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, userId)
            .query('DELETE FROM users WHERE id = @id');
        res.send('User deleted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000; // Use Render's port
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});