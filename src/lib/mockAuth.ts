/**
 * Mock authentication library for development
 * Uses localStorage to persist user sessions
 *
 * Replace with real authentication (Firebase, Supabase, etc.) in production
 */

export interface User {
  email: string;
  name: string;
  avatarUrl?: string;
  acblNumber?: string;
  createdAt: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

const STORAGE_KEY = 'bridge_app_user';

export const auth = {
  /**
   * Login with email and password
   * Simulates 1-second network delay
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    await new Promise((r) => setTimeout(r, 1000)); // Simulate network delay

    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    if (!email.includes('@')) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      };
    }

    const user: User = {
      email,
      name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return {
      success: true,
      user,
    };
  },

  /**
   * Sign up with email and password
   * Simulates 1-second network delay
   */
  signup: async (email: string, password: string, confirmPassword: string): Promise<AuthResponse> => {
    await new Promise((r) => setTimeout(r, 1000)); // Simulate network delay

    if (!email || !password || !confirmPassword) {
      return {
        success: false,
        error: 'All fields are required',
      };
    }

    if (!email.includes('@')) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match',
      };
    }

    const user: User = {
      email,
      name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return {
      success: true,
      user,
    };
  },

  /**
   * Send password reset email
   * Simulates 1-second network delay
   */
  resetPassword: async (email: string): Promise<AuthResponse> => {
    await new Promise((r) => setTimeout(r, 1000)); // Simulate network delay

    if (!email) {
      return {
        success: false,
        error: 'Email is required',
      };
    }

    if (!email.includes('@')) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    // Mock success - in real app, this would send an email
    return {
      success: true,
    };
  },

  /**
   * Logout current user
   */
  logout: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Get currently logged-in user
   */
  getCurrentUser: (): User | null => {
    const userJson = localStorage.getItem(STORAGE_KEY);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY);
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates: Partial<User>): Promise<AuthResponse> => {
    await new Promise((r) => setTimeout(r, 500)); // Simulate network delay

    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const updatedUser = {
      ...currentUser,
      ...updates,
      email: currentUser.email, // Email cannot be changed via profile update
      createdAt: currentUser.createdAt, // Created date cannot be changed
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

    return {
      success: true,
      user: updatedUser,
    };
  },
};
