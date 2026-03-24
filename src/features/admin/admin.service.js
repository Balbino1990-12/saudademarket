const fs = require('fs');
const path = require('path');

const credFile = path.join(__dirname, '../../../admin-credentials.json');
const ADMIN_CREDENTIALS = JSON.parse(fs.readFileSync(credFile, 'utf8')).admin;

function generateSessionToken(){
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function login(req, res, app){
  const { username, password } = req.body;
  try{
    if(username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password){
      const token = generateSessionToken();
      app.locals.activeSessions.set(token, { username, loginTime: new Date() });
      return res.json({ success: true, token });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }catch(err){
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function logout(req, res, app){
  app.locals.activeSessions.delete(req.adminToken);
  res.json({ success: true });
}

module.exports = { login, logout, generateSessionToken };