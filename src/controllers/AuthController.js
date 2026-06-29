const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
  static getRegisterPageConfig() {
    return {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      facebookAppId: process.env.FACEBOOK_APP_ID || '',
      appleClientId: process.env.APPLE_CLIENT_ID || ''
    };
  }

  static buildRegisterPageHtml() {
    const fs = require('fs');
    const path = require('path');

    const filePath = path.join(__dirname, '../../backend/user/register.html');
    const html = fs.readFileSync(filePath, 'utf8');
    const configScript = `<script id="social-login-config">window.__SOCIAL_LOGIN_CONFIG__ = ${JSON.stringify(this.getRegisterPageConfig())};</script>`;

    if (html.includes('id="social-login-config"')) {
      return html;
    }

    return html.replace('</head>', `${configScript}</head>`);
  }

  static stateKey(provider) {
    return `oauth_state_${provider}`;
  }

  static verifyOAuthState(req, provider, state) {
    const expectedState = req.session?.[this.stateKey(provider)];
    if (!state || !expectedState || state !== expectedState) {
      return false;
    }

    delete req.session[this.stateKey(provider)];
    return true;
  }

  static async getOAuthSession(req, res) {
    try {
      if (req.session?.oauthUser?.id) {
        return res.json({
          success: true,
          token: req.session.oauthToken || req.cookies?.userToken || null,
          accessToken: req.session.oauthToken || req.cookies?.userToken || null,
          user: req.session.oauthUser
        });
      }

      const token = req.cookies?.userToken || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      let decodedToken;
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      } catch (error) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      if (!decodedToken?.id) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      const user = await User.getById(decodedToken.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        success: true,
        token,
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          city: user.city,
          role: user.role_name || decodedToken.role || 'buyer',
          profile_picture: user.profile_picture || null,
          active: user.active
        }
      });
    } catch (error) {
      console.error('OAuth session error:', error.message);
      return res.status(500).json({
        error: 'Failed to load authenticated session',
        message: error.message
      });
    }
  }

  static async logout(req, res) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    };

    try {
      if (req.session) {
        await new Promise((resolve) => {
          req.session.destroy(() => resolve());
        });
      }

      res.clearCookie('userToken', cookieOptions);
      res.clearCookie('portugalstore.sid', cookieOptions);
      return res.json({ success: true });
    } catch (error) {
      console.error('OAuth logout error:', error.message);
      res.clearCookie('userToken', cookieOptions);
      res.clearCookie('portugalstore.sid', cookieOptions);
      return res.status(500).json({
        error: 'Failed to logout',
        message: error.message
      });
    }
  }

  static createOAuthState() {
    const randomBytes = require('crypto').randomBytes(16).toString('hex');
    return Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      random: randomBytes
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  static async initGoogleAuth(req, res) {
    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: 'Google OAuth is not configured' });
      }

      if (!req.session) {
        throw new Error('Session middleware is not available');
      }

      const state = AuthController.createOAuthState();
      req.session[AuthController.stateKey('google')] = state;

      const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `state=${encodeURIComponent(state)}`;

      return res.redirect(authUrl);
    } catch (error) {
      console.error('Google OAuth init error:', error.message);
      return res.status(500).json({
        error: 'Failed to initialize Google OAuth',
        message: error.message
      });
    }
  }

  static async initFacebookAuth(req, res) {
    try {
      if (!process.env.FACEBOOK_APP_ID) {
        return res.status(500).json({ error: 'Facebook OAuth is not configured' });
      }

      const state = AuthController.createOAuthState();
      req.session[AuthController.stateKey('facebook')] = state;

      const redirectUri = `${process.env.APP_URL}/api/auth/facebook/callback`;
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('email,public_profile')}&` +
        `state=${encodeURIComponent(state)}&` +
        `response_type=code`;

      return res.redirect(authUrl);
    } catch (error) {
      console.error('Facebook OAuth init error:', error.message);
      return res.status(500).json({ error: 'Failed to initialize Facebook OAuth' });
    }
  }

  /**
   * Handle Google OAuth callback
   */
  static async handleGoogleCallback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
      }

      // Verify state parameter (CSRF protection)
      if (!AuthController.verifyOAuthState(req, 'google', state)) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info from Google
      const userResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const googleUser = userResponse.data;

      // Find or create user
      const user = await AuthController.findOrCreateOAuthUser({
        provider: 'google',
        providerId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      });

      if (!user) {
        return res.status(500).json({ error: 'Failed to create or fetch user' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set session cookies or return token
      res.cookie('userToken', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      req.session.isUser = true;
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.role = user.role;
      req.session.authProvider = 'google';
      req.session.oauthToken = token;
      req.session.oauthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        city: user.city,
        role: user.role || 'buyer',
        profile_picture: user.profile_picture || null,
        active: user.active
      };

      await new Promise((resolve, reject) => {
        req.session.save((saveError) => {
          if (saveError) {
            reject(saveError);
            return;
          }
          resolve();
        });
      });

      // Redirect to dashboard or profile page
      res.redirect(`/index.html?auth=success&provider=google`);
    } catch (error) {
      if (error && error.code === 'USER_DEACTIVATED') {
        return res.status(403).json({
          error: error.message
        });
      }
      console.error('Google OAuth error:', error.message);
      res.status(500).json({ 
        error: 'Authentication failed',
        message: error.message 
      });
    }
  }

  /**
   * Handle Facebook OAuth callback
   */
  static async handleFacebookCallback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
      }

      // Verify state parameter (CSRF protection)
      if (!AuthController.verifyOAuthState(req, 'facebook', state)) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: `${process.env.APP_URL}/api/auth/facebook/callback`,
          code: code
        }
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info from Facebook
      const userResponse = await axios.get(
        'https://graph.facebook.com/me',
        {
          params: {
            fields: 'id,name,email,picture',
            access_token: accessToken
          }
        }
      );

      const facebookUser = userResponse.data;

      // Find or create user
      const user = await AuthController.findOrCreateOAuthUser({
        provider: 'facebook',
        providerId: facebookUser.id,
        email: facebookUser.email,
        name: facebookUser.name,
        picture: facebookUser.picture?.data?.url
      });

      if (!user) {
        return res.status(500).json({ error: 'Failed to create or fetch user' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set session cookies
      res.cookie('userToken', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      req.session.isUser = true;
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.role = user.role;
      req.session.authProvider = 'facebook';
      req.session.oauthToken = token;
      req.session.oauthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        city: user.city,
        role: user.role || 'buyer',
        profile_picture: user.profile_picture || null,
        active: user.active
      };

      await new Promise((resolve, reject) => {
        req.session.save((saveError) => {
          if (saveError) {
            reject(saveError);
            return;
          }
          resolve();
        });
      });

      // Redirect to dashboard
      res.redirect(`/index.html?auth=success&provider=facebook`);
    } catch (error) {
      if (error && error.code === 'USER_DEACTIVATED') {
        return res.status(403).json({
          error: error.message
        });
      }
      console.error('Facebook OAuth error:', error.message);
      res.status(500).json({ 
        error: 'Authentication failed',
        message: error.message 
      });
    }
  }

  /**
   * Initialize Apple OAuth (backend-mediated flow)
   */
  static async initAppleAuth(req, res) {
    try {
      const missingFields = ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'].filter((key) => !process.env[key]);
      if (missingFields.length > 0) {
        throw new Error(`Apple OAuth is not configured: missing ${missingFields.join(', ')}`);
      }

      const state = AuthController.createOAuthState();
      req.session[AuthController.stateKey('apple')] = state;

      // Generate a temporary code_challenge for PKCE
      const codeChallenge = AuthController.generateCodeChallenge();
      
      // Store in session (you may want to use Redis or database)
      req.session.pkce_code_challenge = codeChallenge.challenge;
      req.session.pkce_code_verifier = codeChallenge.verifier;

      const redirectUri = `${process.env.APP_URL}/api/auth/apple/callback`;
      
      const authUrl = `https://appleid.apple.com/auth/authorize?` +
        `client_id=${encodeURIComponent(process.env.APPLE_CLIENT_ID)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('email name')}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${encodeURIComponent(state)}&` +
        `code_challenge=${encodeURIComponent(codeChallenge.challenge)}&` +
        `code_challenge_method=S256&` +
        `response_mode=form_post`;

      res.redirect(authUrl);
    } catch (error) {
      console.error('Apple OAuth init error:', error.message);
      res.status(500).json({
        error: 'Failed to initialize Apple OAuth',
        message: error.message
      });
    }
  }

  /**
   * Handle Apple OAuth callback
   */
  static async handleAppleCallback(req, res) {
    try {
      const { code, state, user } = req.body;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
      }

      if (!AuthController.verifyOAuthState(req, 'apple', state)) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      // Generate client secret (JWT)
      const clientSecret = AuthController.generateAppleClientSecret();
      const codeVerifier = req.session?.pkce_code_verifier;

      if (!codeVerifier) {
        return res.status(400).json({ error: 'PKCE verifier is missing' });
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.post(
        'https://appleid.apple.com/auth/token',
        new URLSearchParams({
          client_id: process.env.APPLE_CLIENT_ID,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.APP_URL}/api/auth/apple/callback`,
          code_verifier: codeVerifier
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const accessToken = tokenResponse.data.access_token;
      const idToken = tokenResponse.data.id_token;

      // Decode ID token to get user info
      const decodedToken = jwt.decode(idToken);
      const appleUser = decodedToken;

      // Parse user object if provided (first time login)
      let userInfo = {};
      if (user) {
        try {
          userInfo = typeof user === 'string' ? JSON.parse(user) : user;
        } catch (e) {
          console.log('Could not parse user info from Apple');
        }
      }

      // Find or create user
      const createdUser = await AuthController.findOrCreateOAuthUser({
        provider: 'apple',
        providerId: appleUser.sub,
        email: appleUser.email || userInfo.email,
        name: userInfo.name?.firstName && userInfo.name?.lastName 
          ? `${userInfo.name.firstName} ${userInfo.name.lastName}`
          : userInfo.email
      });

      if (!createdUser) {
        return res.status(500).json({ error: 'Failed to create or fetch user' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: createdUser.id, email: createdUser.email, role: createdUser.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set session cookies
      res.cookie('userToken', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      // Redirect to dashboard
      res.redirect(`/index.html?auth=success&provider=apple`);
    } catch (error) {
      if (error && error.code === 'USER_DEACTIVATED') {
        return res.status(403).json({
          error: error.message
        });
      }
      console.error('Apple OAuth error:', error.message);
      res.status(500).json({ 
        error: 'Authentication failed',
        message: error.message 
      });
    }
  }

  /**
   * Find or create OAuth user
   */
  static async findOrCreateOAuthUser(oauthData) {
    try {
      // Check if user with OAuth provider ID exists
      let user = await User.getByOAuth(oauthData.provider, oauthData.providerId);

      if (user) {
        if (!user.active) {
          const error = new Error('Your user have deactivated for some reason, contact your administrator to activate again');
          error.code = 'USER_DEACTIVATED';
          throw error;
        }
        return user;
      }

      // Check if user with email exists
      user = await User.getByEmail(oauthData.email);

      if (user) {
        if (!user.active) {
          const error = new Error('Your user have deactivated for some reason, contact your administrator to activate again');
          error.code = 'USER_DEACTIVATED';
          throw error;
        }
        // Link OAuth account to existing user
        return await User.update(user.id, {
          oauth_provider: oauthData.provider,
          oauth_provider_id: oauthData.providerId,
          profile_picture: oauthData.picture || user.profile_picture || null
        });
      }

      // Create new user
      user = await User.create({
        username: oauthData.name || oauthData.email.split('@')[0],
        email: oauthData.email,
        password: null, // OAuth users don't have password
        first_name: oauthData.name?.split(' ')[0] || '',
        last_name: oauthData.name?.split(' ').slice(1).join(' ') || '',
        oauth_provider: oauthData.provider,
        oauth_provider_id: oauthData.providerId,
        profile_picture: oauthData.picture || null,
        role: 'buyer', // Default role for new OAuth users
        active: 1
      });

      return user;
    } catch (error) {
      console.error('Error finding or creating OAuth user:', error);
      return null;
    }
  }

  /**
   * Generate PKCE code challenge and verifier
   */
  static generateCodeChallenge() {
    const crypto = require('crypto');
    const verifier = crypto.randomBytes(32).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return { verifier, challenge };
  }

  /**
   * Generate Apple client secret (JWT)
   */
  static generateAppleClientSecret() {
    const header = {
      alg: 'ES256',
      kid: process.env.APPLE_KEY_ID,
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: process.env.APPLE_TEAM_ID,
      iat: now,
      exp: now + 3600, // 1 hour
      aud: 'https://appleid.apple.com',
      sub: process.env.APPLE_CLIENT_ID
    };

    const privateKey = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!privateKey || !process.env.APPLE_KEY_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_CLIENT_ID) {
      throw new Error('Apple OAuth credentials are not configured');
    }

    return jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: header
    });
  }
}

module.exports = AuthController;
