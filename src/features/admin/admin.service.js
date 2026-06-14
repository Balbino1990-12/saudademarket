const crypto = require('crypto');
const Admin = require('../../models/Admin');
const SessionManager = require('../../services/SessionManager');

function generateSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function login(req, res, app) {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.authenticate(username, password);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateSessionToken();
    SessionManager.create(token, admin.username, admin.id);

    return res.json({ success: true, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function logout(req, res, app) {
  SessionManager.destroy(req.adminToken);
  res.json({ success: true });
}

module.exports = { login, logout, generateSessionToken };
