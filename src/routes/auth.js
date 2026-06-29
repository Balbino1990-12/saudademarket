const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

/**
 * OAuth authentication endpoints
 */
router.get('/session', AuthController.getOAuthSession);
router.post('/logout', AuthController.logout);

// Google OAuth initiation handler
router.get('/google/init', AuthController.initGoogleAuth);


// Google OAuth callback handler
router.get('/google/callback', AuthController.handleGoogleCallback);
// Facebook OAuth initiation handler
router.get('/facebook/init', AuthController.initFacebookAuth);


// Facebook OAuth callback handler
router.get('/facebook/callback', AuthController.handleFacebookCallback);

// Apple OAuth initialization (backend-mediated flow)
router.get('/apple/init', AuthController.initAppleAuth);

// Apple OAuth callback handler
router.post('/apple/callback', AuthController.handleAppleCallback);

module.exports = router;
