/**
 * PARKX — Mandatory Authentication & Session Engine
 * Valid Credential:
 *   Username: PARKX
 *   Password: PARKX2026
 */

const ParkXAuth = (function() {
    'use strict';

    // Single valid credential configuration
    const VALID_CREDENTIALS = {
        username: 'PARKX',
        password: 'PARKX2026'
    };

    const AUTH_SESSION_KEY = 'parkx_auth_session';
    const AUTH_USER_KEY = 'parkx_auth_user';
    const AUTH_TOKEN_VAL = 'PARKX_AUTHENTICATED_SECURE_TOKEN_2026';

    /**
     * Check if current session is authenticated
     */
    function isAuthenticated() {
        try {
            const sessionToken = sessionStorage.getItem(AUTH_SESSION_KEY);
            const localToken = localStorage.getItem(AUTH_SESSION_KEY);
            return sessionToken === AUTH_TOKEN_VAL || localToken === AUTH_TOKEN_VAL;
        } catch (e) {
            return false;
        }
    }

    /**
     * Authenticate operator credentials
     * Only exact username "PARKX" and password "PARKX2026" accepted
     */
    function login(username, password) {
        if (typeof username !== 'string' || typeof password !== 'string') {
            return { success: false, message: 'Invalid username or password.' };
        }

        // Exact case-sensitive match
        if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
            try {
                sessionStorage.setItem(AUTH_SESSION_KEY, AUTH_TOKEN_VAL);
                sessionStorage.setItem(AUTH_USER_KEY, VALID_CREDENTIALS.username);
                localStorage.setItem(AUTH_SESSION_KEY, AUTH_TOKEN_VAL);
                localStorage.setItem(AUTH_USER_KEY, VALID_CREDENTIALS.username);
            } catch (e) {
                console.warn('Storage write failed:', e);
            }
            return { success: true };
        } else {
            return { success: false, message: 'Invalid username or password.' };
        }
    }

    /**
     * Terminate active session and redirect to login screen
     */
    function logout() {
        try {
            sessionStorage.removeItem(AUTH_SESSION_KEY);
            sessionStorage.removeItem(AUTH_USER_KEY);
            localStorage.removeItem(AUTH_SESSION_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
        } catch (e) {
            console.warn('Storage clear failed:', e);
        }
        window.location.replace('login.html');
    }

    /**
     * Guard protected page: immediately redirects if unauthenticated
     */
    function requireAuth() {
        if (!isAuthenticated()) {
            document.documentElement.style.display = 'none';
            window.location.replace('login.html');
            return false;
        }
        return true;
    }

    /**
     * Guard login page: redirects to dashboard if already authenticated
     */
    function redirectIfAuthenticated(targetUrl) {
        if (isAuthenticated()) {
            window.location.replace(targetUrl || 'index.html#live-parking');
            return true;
        }
        return false;
    }

    /**
     * Get authenticated operator username
     */
    function getCurrentUser() {
        try {
            return sessionStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(AUTH_USER_KEY) || VALID_CREDENTIALS.username;
        } catch (e) {
            return VALID_CREDENTIALS.username;
        }
    }

    return {
        login: login,
        logout: logout,
        isAuthenticated: isAuthenticated,
        requireAuth: requireAuth,
        redirectIfAuthenticated: redirectIfAuthenticated,
        getCurrentUser: getCurrentUser,
        AUTH_SESSION_KEY: AUTH_SESSION_KEY,
        AUTH_TOKEN_VAL: AUTH_TOKEN_VAL
    };
})();

// Attach globally if in browser or export if in module/node
if (typeof window !== 'undefined') {
    window.ParkXAuth = ParkXAuth;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParkXAuth;
}

