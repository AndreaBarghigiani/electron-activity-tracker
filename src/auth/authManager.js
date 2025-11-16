const axios = require('axios');

class AuthManager {
  /**
   * Private constructor to ensure instantiation via build method.
   * @param {any} StoreClass The electron-store class
   */
  constructor(StoreClass) {
    this.store = new StoreClass({
      encryptionKey: 'activity-tracker-secure-key', // In production, use a better key
      name: 'auth-data',
    });
    this.apiUrl = process.env.AUTH_API_URL || 'http://localhost:3000';
  }

  /**
   * Asynchronously builds and returns an AuthManager instance.
   * This handles the dynamic import of electron-store.
   * @returns {Promise<AuthManager>}
   */
  static async build() {
    const { default: Store } = await import('electron-store');
    return new AuthManager(Store);
  }

  /**
   * Login with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async login(email, password) {
    try {
      console.log(
        `🔐 Attempting login to ${this.apiUrl}/api/auth/sign-in/email`
      );

      const response = await axios.post(
        `${this.apiUrl}/api/auth/sign-in/email`,
        {
          email,
          password,
        }
      );

      if (response.data && response.data.user) {
        // Extract session tokens from cookies
        const cookies = response.headers['set-cookie'];
        let sessionToken = null;
        let sessionTokenSignature = null;
        let sessionCookieHeader = null;

        if (cookies && Array.isArray(cookies) && cookies.length > 0) {
          // Build a generic Cookie header from all Set-Cookie values (name=value only)
          const cookiePairs = cookies.map((cookie) => cookie.split(';')[0]);
          sessionCookieHeader = cookiePairs.join('; ');

          // Best-effort extraction of Better Auth cookies for potential future use
          cookies.forEach((cookie) => {
            if (cookie.includes('better-auth.session_token')) {
              const match = cookie.match(/better-auth\.session_token=([^;]+)/);
              if (match) {
                sessionToken = match[1];
              }
            }
            if (cookie.includes('better-auth.session_token_signature')) {
              const match = cookie.match(
                /better-auth\.session_token_signature=([^;]+)/
              );
              if (match) {
                sessionTokenSignature = match[1];
              }
            }
          });
        }

        // Fallback: some Better Auth setups may return a session object with a token
        if (!sessionToken && response.data.session?.token) {
          sessionToken = response.data.session.token;
        }

        // Store user data and session tokens
        const authData = {
          user: response.data.user,
          sessionToken: sessionToken,
          sessionTokenSignature: sessionTokenSignature,
          sessionCookie: sessionCookieHeader,
          timestamp: Date.now(),
        };

        this.store.set('auth', authData);
        console.log('✅ Login successful, session stored');

        return {
          success: true,
          user: response.data.user,
        };
      }

      return {
        success: false,
        error: 'Invalid response from server',
      };
    } catch (error) {
      console.error('❌ Login failed:', error.message);

      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || 'Invalid email or password',
        };
      }

      return {
        success: false,
        error:
          'Could not connect to server. Please check your internet connection.',
      };
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    const auth = this.store.get('auth');
    return !!auth && !!auth.user;
  }

  /**
   * Get stored user data
   * @returns {object|null}
   */
  getUser() {
    const auth = this.store.get('auth');
    return auth?.user || null;
  }

  /**
   * Get session token for API requests
   * @returns {string|null}
   */
  getSessionToken() {
    const auth = this.store.get('auth');
    return auth?.sessionToken || null;
  }

  /**
   * Get raw session cookie header for API requests
   * @returns {string|null}
   */
  getSessionCookie() {
    const auth = this.store.get('auth');
    return auth?.sessionCookie || null;
  }

  /**
   * Get session token signature for API requests
   * @returns {string|null}
   */
  getSessionTokenSignature() {
    const auth = this.store.get('auth');
    return auth?.sessionTokenSignature || null;
  }

  /**
   * Validate session with server
   * @returns {Promise<boolean>}
   */
  async validateSession() {
    try {
      const authHeadersConfig = this.getAuthHeaders();
      const headers = authHeadersConfig.headers || {};

      if (!Object.keys(headers).length) {
        return false;
      }

      // Call Better Auth session endpoint using the same auth headers we use elsewhere
      const response = await axios.get(`${this.apiUrl}/api/auth/get-session`, {
        headers,
      });

      if (response.data && response.data.user) {
        console.log('✅ Session is valid');
        return true;
      }

      console.log('⚠️  Session invalid, clearing stored data');
      this.logout();
      return false;
    } catch (error) {
      console.error('❌ Session validation failed:', error.message);
      this.logout();
      return false;
    }
  }

  /**
   * Logout and clear stored data
   */
  logout() {
    this.store.delete('auth');
    console.log('👋 Logged out');
  }

  /**
   * Get axios config with authentication headers
   * @returns {object}
   */
  getAuthHeaders() {
    const sessionToken = this.getSessionToken();
    const sessionTokenSignature = this.getSessionTokenSignature();
    const sessionCookie = this.getSessionCookie();

    const headers = {};

    if (sessionCookie) {
      // Prefer sending the exact cookies the server set on login
      headers["Cookie"] = sessionCookie;
    } else if (sessionToken && sessionTokenSignature) {
      // Fallback: construct Better Auth cookie header from stored pieces
      headers["Cookie"] = `better-auth.session_token=${sessionToken}; better-auth.session_token_signature=${sessionTokenSignature}`;
    } else if (sessionToken) {
      // Last resort: use bearer token when we only have a single token
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }

    if (Object.keys(headers).length === 0) {
      return {};
    }

    return { headers };
  }
}

module.exports = AuthManager;
