// API utility functions with URL validation
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://saas-notes-app.vercel.app',
  process.env.NEXT_PUBLIC_API_BASE_URL
].filter(Boolean);

export function validateApiUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_ORIGINS.some(origin => url.startsWith(origin));
  } catch {
    return false;
  }
}

export function getApiUrl(endpoint: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : '');
  
  const fullUrl = `${baseUrl}${endpoint}`;
  
  if (!validateApiUrl(fullUrl)) {
    throw new Error('Invalid API URL');
  }
  
  return fullUrl;
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = getApiUrl(endpoint);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers: defaultHeaders,
  });
}