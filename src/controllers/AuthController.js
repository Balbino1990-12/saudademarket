const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
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
      if (!state || state.length === 0) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info from Google
      const userResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const googleUser = userResponse.data;

      // Find or create user
      const user = await this.findOrCreateOAuthUser({
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

      // Redirect to dashboard or profile page
      res.redirect(`/index.html?auth=success&provider=google`);
    } catch (error) {
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
      if (!state || state.length === 0) {
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
      const user = await this.findOrCreateOAuthUser({
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

      // Redirect to dashboard
      res.redirect(`/index.html?auth=success&provider=facebook`);
    } catch (error) {
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
      const { state } = req.query;

      if (!state) {
        return res.status(400).json({ error: 'State parameter is missing' });
      }

      // Generate a temporary code_challenge for PKCE
      const codeChallenge = this.generateCodeChallenge();
      
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
        `response_mode=form_post`;

      res.redirect(authUrl);
    } catch (error) {
      console.error('Apple OAuth init error:', error.message);
      res.status(500).json({ error: 'Failed to initialize Apple OAuth' });
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

      // Generate client secret (JWT)
      const clientSecret = this.generateAppleClientSecret();

      // Exchange authorization code for access token
      const tokenResponse = await axios.post(
        'https://appleid.apple.com/auth/token',
        {
          client_id: process.env.APPLE_CLIENT_ID,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.APP_URL}/api/auth/apple/callback`
        },
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
      const createdUser = await this.findOrCreateOAuthUser({
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
      let user = await User.findOne({ 
        where: { 
          oauth_provider: oauthData.provider,
          oauth_provider_id: oauthData.providerId 
        } 
      });

      if (user) {
        return user;
      }

      // Check if user with email exists
      user = await User.findOne({ where: { email: oauthData.email } });

      if (user) {
        // Link OAuth account to existing user
        user.oauth_provider = oauthData.provider;
        user.oauth_provider_id = oauthData.providerId;
        await user.save();
        return user;
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
        is_active: 1
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
    const crypto = require('crypto');
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

    // This is simplified - you'll need to use the private key file
    // For production, use proper JWT library with private key
    return jwt.sign(payload, process.env.APPLE_PRIVATE_KEY || 'secret', {
      algorithm: 'HS256',
      header: header
    });
  }
}

module.exports = AuthController;
