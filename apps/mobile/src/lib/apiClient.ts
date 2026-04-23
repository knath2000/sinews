import { supabase } from './supabaseClient';

export interface FeedArticle {
  id: string;
  title: string;
  snippet: string | null;
  published_at: string;
  source_name: string;
  canonical_url: string;
  image_url: string | null;
  editorial_priority: number;
  summary: string | null;
  tldr: string | null;
  why_recommended: string | null;
  provenance_json: string | null;
  replacement_outcome: string | null;
  is_paywalled: boolean;
}

export interface BriefProgress {
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress_message?: string;
  percent?: number;
}

export interface TodayBrief {
  date: string;
  total_articles: number;
  articles: FeedArticle[];
  is_paywalled?: boolean;
}

interface ApiError {
  error: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  async getBrief(): Promise<{ articles: TodayBrief | null; progress: BriefProgress | null }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api/feed`, { headers });

    if (response.status === 202) {
      const data = await response.json();
      return { articles: null, progress: data as BriefProgress };
    }

    if (!response.ok) {
      const data = (await response.json()) as ApiError;
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { articles: data as TodayBrief, progress: null };
  }

  async submitFeedback(articleId: string, action: 'thumbs_up' | 'thumbs_down'): Promise<{ success: boolean }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ article_id: articleId, action }),
    });

    if (!response.ok) {
      const data = (await response.json()) as ApiError;
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getUserProfile(): Promise<{ email: string; displayName: string | null; timezone: string | null }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api/me`, { headers });

    if (!response.ok) {
      const data = (await response.json()) as ApiError;
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async updateProfile(data: { display_name?: string; timezone?: string }): Promise<{ success: boolean }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api/settings/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = (await response.json()) as ApiError;
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getTopics(): Promise<{ topics: { topic: string; weight: number; source: string }[] }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api/settings/topics`, { headers });

    if (!response.ok) {
      const err = (await response.json()) as ApiError;
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async toggleTheme(darkMode: boolean): Promise<{ success: boolean }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api/settings/theme`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ dark_mode: darkMode }),
    });

    if (!response.ok) {
      const err = (await response.json()) as ApiError;
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
