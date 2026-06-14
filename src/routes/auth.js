const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

/**
 * OAuth authentication endpoints
 */

// Google OAuth callback handler
router.get('/google/callback', AuthController.handleGoogleCallback);

// Facebook OAuth callback handler
router.get('/facebook/callback', AuthController.handleFacebookCallback);

// Apple OAuth initialization (backend-mediated flow)
router.get('/apple/init', AuthController.initAppleAuth);

// Apple OAuth callback handler
router.post('/apple/callback', AuthController.handleAppleCallback);

module.exports = router;
