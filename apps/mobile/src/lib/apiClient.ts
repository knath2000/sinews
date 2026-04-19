// Type-safe API client for the existing backend endpoints
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types for our API responses
export interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  source: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  newsletterSubscription: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
  };
}

// API client class
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // In a real implementation, the base URL would be configurable
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

    // We can retrieve the token from storage when needed
    this.loadToken();
  }

  private async loadToken(): Promise<void> {
    try {
      this.token = await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  private async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('access_token', token);
      this.token = token;
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  private async refreshToken(): Promise<string | null> {
    // Refresh token logic would go here
    // This is a placeholder for the mobile-specific implementation
    return this.token;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Feed endpoint
  async getFeed(limit: number = 20): Promise<FeedItem[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/api/feed?limit=${limit}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      throw error;
    }
  }

  // Settings endpoints
  async getSettings(): Promise<UserSettings> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      throw error;
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await this.saveToken(data.access_token);
      return data;
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await this.saveToken(data.access_token);
      return data;
    } catch (error) {
      console.error('Failed to sign up:', error);
      throw error;
    }
  }

  // Get current user profile
  async getUser(): Promise<{ id: string; email: string; createdAt: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/api/me`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const headers = await this.getHeaders();
      await fetch(`${this.baseUrl}/api/auth/signout`, {
        method: 'POST',
        headers,
      });

      // Clear token from storage
      await AsyncStorage.removeItem('access_token');
      this.token = null;
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Even if it fails, we still want to clear the local token
      await AsyncStorage.removeItem('access_token');
      this.token = null;
    }
  }
}

export const apiClient = new ApiClient();