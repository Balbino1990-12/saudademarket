# OAuth Social Login Setup Guide

This guide explains how to set up Google, Facebook, and Apple OAuth integration for the PortugalStore registration system.

## Overview

The application now supports social authentication through three major OAuth providers:
- **Google Sign-In**
- **Facebook Login**
- **Apple Sign In**

Users can click the social login buttons on the registration page to create an account or log in with their existing social accounts.

## Backend Setup

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key_pem

# Base URL for OAuth redirects
APP_URL=http://localhost:3000  # Production: https://your-domain.com
```

### Database Schema

The User model needs to support OAuth fields. Ensure your users table has:

```sql
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN oauth_provider_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL;

-- Add unique constraint for OAuth provider linking
ALTER TABLE users ADD UNIQUE KEY unique_oauth (oauth_provider, oauth_provider_id);
```

## Provider Setup Instructions

### 1. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: "PortugalStore"
3. Enable the "Google+ API"

#### Step 2: Create OAuth 2.0 Credentials
1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Select **Web Application**
3. Add Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
4. Copy the **Client ID** and **Client Secret**

#### Step 3: Add to .env
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

### 2. Facebook OAuth Setup

#### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Choose **Consumer** as app type
4. Fill in app details and create the app

#### Step 2: Configure Facebook Login
1. In the app dashboard, go to **Products** → Click **+ Add Product**
2. Search for **Facebook Login** and add it
3. Go to **Settings** → **Basic** and copy the **App ID** and **App Secret**

#### Step 3: Configure OAuth Redirect URIs
1. In Facebook Login settings, go to **Settings** → **Valid OAuth Redirect URIs**
2. Add:
   - Development: `http://localhost:3000/api/auth/facebook/callback`
   - Production: `https://your-domain.com/api/auth/facebook/callback`
3. Save changes

#### Step 4: Add to .env
```env
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
```

---

### 3. Apple OAuth Setup

#### Step 1: Enroll in Apple Developer Program
1. Go to [Apple Developer](https://developer.apple.com)
2. Enroll in the Apple Developer Program ($99/year)
3. Register your app in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)

#### Step 2: Create Service ID and Key
1. Go to **Identifiers** → Create a new **App ID** or use existing
2. Create a **Service ID** for your web app:
   - Identifier: `com.portugalstor.web` (or your domain)
   - Enable "Sign In with Apple"
3. Configure return URLs (domain verification):
   - `https://your-domain.com`
   - `http://localhost:3000` (for development)

#### Step 3: Create Private Key
1. Go to **Keys** → Create new key
2. Enable "Sign in with Apple"
3. Download the private key file (`.p8`)
4. Note the **Key ID**

#### Step 4: Add to .env
```env
APPLE_CLIENT_ID=com.portugalstor.web
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour...\n-----END PRIVATE KEY-----
```

**Important**: When setting `APPLE_PRIVATE_KEY`, preserve the newlines correctly in your .env file or use a proper environment variable parser.

---

## Frontend Setup

The registration page (`backend/user/register.html`) includes social login buttons that are automatically styled and functional once OAuth credentials are configured.

### User Flow

1. User clicks "Google", "Facebook", or "Apple" button
2. Browser redirects to provider's authentication page
3. User authenticates with their social account
4. Provider redirects back to your app with authorization code
5. Backend exchanges code for user information
6. User is automatically created/logged in
7. User is redirected to dashboard

### Custom Configuration

To customize the social buttons, edit:
```javascript
// src/routes/auth.js - OAuth endpoint handlers
// backend/user/register.html - Button UI and event handlers
// public/translations.json - Button labels and text
```

---

## Security Considerations

1. **State Parameter**: CSRF protection using state parameter in OAuth flow ✅
2. **PKCE Flow**: Used for Apple OAuth to prevent code interception ✅
3. **Secure Cookies**: OAuth tokens stored in HTTP-only cookies ✅
4. **Token Expiration**: JWT tokens expire after 24 hours ✅
5. **Email Verification**: Consider adding email verification for OAuth signups

---

## Testing

### Local Testing

1. Set `APP_URL=http://localhost:3000` in .env
2. For Google/Facebook: Update redirect URIs to include localhost
3. For Apple: Use ngrok or similar to create HTTPS tunnel for Apple (Apple requires HTTPS)

```bash
# Using ngrok
ngrok http 3000
# Then update APP_URL to the ngrok URL
```

### Testing Flow

1. Navigate to `http://localhost:3000/user/register.html`
2. Click a social provider button
3. Authenticate with your provider account
4. Verify user is created/logged in
5. Check database for oauth_provider and oauth_provider_id fields

---

## Troubleshooting

### Issue: "Invalid redirect_uri"
**Solution**: Ensure the redirect URI in your provider's app settings exactly matches the one in code (including protocol, domain, and path).

### Issue: "CORS error"
**Solution**: This is normal for OAuth - redirects happen via user's browser, not API calls. Check browser console for actual OAuth errors.

### Issue: "User not found after OAuth"
**Solution**: Check that database fields `oauth_provider` and `oauth_provider_id` exist. Run migration scripts if needed.

### Issue: "Apple OAuth not working"
**Solution**: 
- Apple requires HTTPS (use ngrok for local testing)
- Private key format must be correct PEM format
- Team ID, Key ID, and Client ID must match

---

## API Endpoints

### Google OAuth
- **Redirect URL**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token URL**: `https://oauth2.googleapis.com/token`
- **User Info URL**: `https://www.googleapis.com/oauth2/v2/userinfo`
- **Callback**: `GET /api/auth/google/callback?code=...&state=...`

### Facebook OAuth
- **Redirect URL**: `https://www.facebook.com/v18.0/dialog/oauth`
- **Token URL**: `https://graph.facebook.com/v18.0/oauth/access_token`
- **User Info URL**: `https://graph.facebook.com/me?fields=id,name,email,picture`
- **Callback**: `GET /api/auth/facebook/callback?code=...&state=...`

### Apple OAuth
- **Redirect URL**: `https://appleid.apple.com/auth/authorize`
- **Token URL**: `https://appleid.apple.com/auth/token`
- **ID Token**: Parsed from JWT response
- **Callback**: `POST /api/auth/apple/callback`

---

## Next Steps

1. **Email Verification**: Add optional email verification for OAuth signups
2. **Profile Completion**: Ask new OAuth users to complete their profile
3. **Account Linking**: Allow existing users to link social accounts
4. **Analytics**: Track signup sources (Google, Facebook, Apple)
5. **Customization**: Customize button styling or add more providers

---

## References

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook OAuth Documentation](https://developers.facebook.com/docs/facebook-login)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/get-started/)
