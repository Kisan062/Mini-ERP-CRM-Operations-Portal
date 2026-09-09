import type { ApiResponse } from '../types';

const rawUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;
  public code?: string;

  constructor(message: string, statusCode: number, details?: any, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('auth_token');
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data?.error?.details, data?.error?.code);
  }

  return data as ApiResponse<T>;
}

export const api = {
  get: <T>(url: string, params?: Record<string, any>) => {
    let query = '';
    if (params) {
      const filtered = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      if (filtered.length > 0) {
        query = `?${filtered.join('&')}`;
      }
    }
    return apiRequest<T>(`${url}${query}`, { method: 'GET' });
  },

  post: <T>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string) =>
    apiRequest<T>(url, {
      method: 'DELETE',
    }),
};
