// lib/auth.ts
/**
 * Authentication Utilities - Cookie-Based
 * ========================================
 * ✅ Task 5: Secure cookie-based authentication
 * 
 * MIGRATION FROM localStorage:
 * - Before: Manually stored token in localStorage
 * - After: Token stored in httpOnly cookie by backend
 * 
 * KEY CHANGES:
 * - No more localStorage.setItem('token')
 * - No more localStorage.getItem('token')
 * - No more Authorization header
 * - Use credentials: 'include' in all fetch calls
 * - Backend sets/clears cookie automatically
 * 
 * SECURITY BENEFITS:
 * - XSS Protection: JavaScript cannot access token
 * - CSRF Protection: SameSite cookie attribute
 * - Automatic expiration: Browser handles cookie lifetime
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'manager' | 'agent';
  organization_id?: number;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  organization_name: string;
}

// =====================================================
// FETCH WITH CREDENTIALS
// =====================================================

/**
 * Fetch wrapper that automatically includes credentials (cookies)
 * 
 * ✅ CRITICAL: credentials: 'include' is required for cookies to work
 * 
 * Usage:
 *   const data = await authFetch('/auth/me');
 *   const result = await authFetch('/calls/list', { method: 'POST', body: ... });
 */
export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    credentials: 'include',  // ✅ CRITICAL: Send cookies with request
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  return fetch(url, config);
}

// =====================================================
// AUTHENTICATION FUNCTIONS
// =====================================================

/**
 * Login user
 * Backend sets httpOnly cookie automatically
 * 
 * ✅ No need to store token in localStorage
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  const data: AuthResponse = await response.json();
  
  // ✅ Store user info in localStorage (not token!)
  // This is safe because user info is not sensitive
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data.user;
}

/**
 * Signup new manager
 * Backend sets httpOnly cookie automatically
 * 
 * ✅ No need to store token in localStorage
 */
export async function signup(data: SignupData): Promise<User> {
  const response = await authFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Signup failed');
  }

  const result: AuthResponse = await response.json();
  
  // ✅ Store user info in localStorage (not token!)
  localStorage.setItem('user', JSON.stringify(result.user));
  
  return result.user;
}

/**
 * Logout user
 * Backend clears httpOnly cookie
 * 
 * ✅ Properly clears all auth state
 */
export async function logout(): Promise<void> {
  try {
    // Call backend to clear cookie
    await authFetch('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with local cleanup even if backend call fails
  } finally {
    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Remove legacy token if exists
  }
}

/**
 * Check if user is authenticated
 * Verifies with backend using cookie
 * 
 * ✅ Secure: Backend validates httpOnly cookie
 */
export async function checkAuth(): Promise<User | null> {
  try {
    const response = await authFetch('/auth/check');

    if (!response.ok) {
      // Not authenticated
      localStorage.removeItem('user');
      return null;
    }

    const data = await response.json();
    
    if (data.authenticated) {
      // Update stored user info
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('Auth check error:', error);
    return null;
  }
}

/**
 * Get current user info from localStorage
 * 
 * ⚠️ This is cached data - use checkAuth() to verify with backend
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 * 
 * Usage in pages:
 *   useEffect(() => {
 *     requireAuth();
 *   }, []);
 */
export async function requireAuth(): Promise<User> {
  const user = await checkAuth();
  
  if (!user) {
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Not authenticated');
  }
  
  return user;
}

/**
 * Require specific role
 * 
 * Usage:
 *   const user = await requireRole('manager');
 */
export async function requireRole(role: 'manager' | 'agent'): Promise<User> {
  const user = await requireAuth();
  
  if (user.role !== role) {
    throw new Error(`Access denied. Required role: ${role}`);
  }
  
  return user;
}

// =====================================================
// MIGRATION HELPER (TEMPORARY)
// =====================================================

/**
 * Clean up old localStorage tokens
 * Call this once during migration to remove old tokens
 * 
 * ⚠️ Remove this function after migration is complete
 */
export function cleanupLegacyAuth(): void {
  if (typeof window !== 'undefined') {
    const oldToken = localStorage.getItem('token');
    if (oldToken) {
      console.log('🔄 Removing legacy token from localStorage');
      localStorage.removeItem('token');
    }
  }
}

// =====================================================
// EXAMPLES
// =====================================================

/**
 * EXAMPLE: Login page
 * 
 * const handleLogin = async (e: React.FormEvent) => {
 *   e.preventDefault();
 *   try {
 *     const user = await login({ email, password });
 *     router.push('/');
 *   } catch (error) {
 *     setError(error.message);
 *   }
 * };
 */

/**
 * EXAMPLE: Protected page
 * 
 * useEffect(() => {
 *   requireAuth().catch(() => {
 *     // User will be redirected to login
 *   });
 * }, []);
 */

/**
 * EXAMPLE: API call
 * 
 * const fetchCalls = async () => {
 *   const response = await authFetch('/calls/list');
 *   const data = await response.json();
 *   setCalls(data.calls);
 * };
 */