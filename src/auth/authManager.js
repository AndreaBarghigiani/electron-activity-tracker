const axios = require('axios');

class AuthManager {
  /**
   * Private constructor to ensure instantiation via build method.
   * @param {any} StoreClass The electron-store class
   */
  constructor(StoreClass) {
    this.store = new StoreClass({
      encryptionKey: 'activity-tracker-secure-key', // In production, use a better key
      name: 'auth-data'
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
      console.log(`🔐 Attempting login to ${this.apiUrl}/api/auth/sign-in/email`);
      
      const response = await axios.post(`${this.apiUrl}/api/auth/sign-in/email`, {
        email,
        password
      });

      if (response.data && response.data.user) {
        // Extract session token from cookies
        const cookies = response.headers['set-cookie'];
        let sessionToken = null;

        if (cookies) {
          // Better Auth typically uses 'better-auth.session_token' cookie
          const sessionCookie = cookies.find(cookie => 
            cookie.includes('better-auth.session_token')
          );
          
          if (sessionCookie) {
            const match = sessionCookie.match(/better-auth\.session_token=([^;]+)/);
            if (match) {
              sessionToken = match[1];
            }
          }
        }

        // Store user data and session token
        const authData = {
          user: response.data.user,
          sessionToken: sessionToken,
          timestamp: Date.now()
        };

        this.store.set('auth', authData);
        console.log('✅ Login successful, session stored');

        return {
          success: true,
          user: response.data.user
        };
      }

      return {
        success: false,
        error: 'Invalid response from server'
      };
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || 'Invalid email or password'
        };
      }

      return {
        success: false,
        error: 'Could not connect to server. Please check your internet connection.'
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
   * Validate session with server
   * @returns {Promise<boolean>}
   */
  async validateSession() {
    try {
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        return false;
      }

      // Call Better Auth session endpoint
      const response = await axios.get(`${this.apiUrl}/api/auth/get-session`, {
        headers: {
          'Cookie': `better-auth.session_token=${sessionToken}`
        }
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
    
    if (sessionToken) {
      return {
        headers: {
          'Cookie': `better-auth.session_token=${sessionToken}`
        }
      };
    }

    return {};
  }
}

module.exports = AuthManager;
