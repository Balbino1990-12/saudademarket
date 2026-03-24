/**
 * Session Manager - Handles admin session storage and validation
 * Uses in-memory storage but with better lifecycle management
 */

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    console.log('[SessionManager] Initialized with 24-hour session timeout');
  }

  /**
   * Create a new session
   */
  create(token, username) {
    const sessionData = {
      token,
      username,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.sessionTimeout
    };
    
    this.sessions.set(token, sessionData);
    console.log(`[SessionManager] ✓ Session CREATED`);
    console.log(`[SessionManager]   User: ${username}`);
    console.log(`[SessionManager]   Token: ${token.substring(0, 15)}...`);
    console.log(`[SessionManager]   Expires: ${new Date(sessionData.expiresAt).toISOString()}`);
    console.log(`[SessionManager]   Total active sessions: ${this.sessions.size}`);
    return sessionData;
  }

  /**
   * Validate a session token
   * @returns {Object|false} Session data if valid, false otherwise
   */
  validate(token) {
    if (!token) {
      console.log('[SessionManager] ✗ VALIDATION FAILED - No token provided');
      return false;
    }

    const session = this.sessions.get(token);
    
    if (!session) {
      console.warn(`[SessionManager] ✗ VALIDATION FAILED - Token not found: ${token.substring(0, 15)}...`);
      console.warn(`[SessionManager]   Available tokens: ${this.sessions.size}`);
      return false;
    }

    const now = Date.now();
    
    // Check if session has expired
    if (now > session.expiresAt) {
      console.warn(`[SessionManager] ✗ VALIDATION FAILED - Session for ${session.username} has EXPIRED`);
      console.warn(`[SessionManager]   Expired at: ${new Date(session.expiresAt).toISOString()}`);
      console.warn(`[SessionManager]   Current time: ${new Date(now).toISOString()}`);
      this.sessions.delete(token);
      return false;
    }

    // Update last activity
    session.lastActivity = now;
    const timeRemaining = session.expiresAt - now;
    const hoursRemaining = Math.round(timeRemaining / (60 * 60 * 1000));
    
    console.log(`[SessionManager] ✓ VALIDATION OK`);
    console.log(`[SessionManager]   User: ${session.username}`);
    console.log(`[SessionManager]   Token: ${token.substring(0, 15)}...`);
    console.log(`[SessionManager]   Hours remaining: ${hoursRemaining}h`);
    console.log(`[SessionManager]   Active sessions: ${this.sessions.size}`);
    
    return session;
  }

  /**
   * Get session data
   */
  get(token) {
    return this.sessions.get(token) || null;
  }

  /**
   * Destroy a session
   */
  destroy(token) {
    if (this.sessions.has(token)) {
      const session = this.sessions.get(token);
      console.log(`[SessionManager] ✓ Session DESTROYED for user: ${session.username}`);
      this.sessions.delete(token);
      console.log(`[SessionManager]   Remaining active sessions: ${this.sessions.size}`);
      return true;
    }
    console.warn(`[SessionManager] ✗ Cannot destroy - token not found`);
    return false;
  }

  /**
   * Get active session count
   */
  getActiveCount() {
    return this.sessions.size;
  }

  /**
   * Cleanup expired sessions (garbage collection)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        console.log(`[SessionManager] ⚠ Cleaning up expired session for ${session.username}`);
        this.sessions.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SessionManager] ✓ Cleanup: Removed ${cleaned} expired sessions, ${this.sessions.size} remaining`);
    }

    return cleaned;
  }

  /**
   * Clear all sessions (for testing/admin purposes)
   */
  clearAll() {
    const count = this.sessions.size;
    this.sessions.clear();
    console.log(`[SessionManager] ⚠ CLEARED ALL ${count} sessions`);
  }

  /**
   * Get all sessions info (for debugging)
   */
  getAllSessions() {
    const sessions = [];
    for (const [token, session] of this.sessions.entries()) {
      sessions.push({
        token: token.substring(0, 15) + '...',
        username: session.username,
        createdAt: new Date(session.createdAt).toISOString(),
        lastActivity: new Date(session.lastActivity).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString()
      });
    }
    return sessions;
  }
}

// Export singleton instance
module.exports = new SessionManager();
