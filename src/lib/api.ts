// ====================================================================
// API CLIENT: Absensi Digital SMA Informatika Nurul Bayan
// ====================================================================

// In production, API calls go to the same origin (/api/...).
// In development, VITE_API_URL can be set to override (e.g., http://localhost:3000/api).
const BASE_URL = ((import.meta as any).env?.VITE_API_URL as string) || '/api';

// ── Auth Token Management ─────────────────────────────────────────────

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('nuba_auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('nuba_auth_token', token);
    } else {
      localStorage.removeItem('nuba_auth_token');
    }
  } catch (err) {
    console.error('Failed to set auth token:', err);
  }
}

export function getSavedRole(): 'student' | 'admin' | null {
  try {
    return (localStorage.getItem('nuba_user_role') as 'student' | 'admin') || null;
  } catch {
    return null;
  }
}

export function setSavedRole(role: 'student' | 'admin' | null): void {
  try {
    if (role) {
      localStorage.setItem('nuba_user_role', role);
    } else {
      localStorage.removeItem('nuba_user_role');
    }
  } catch (err) {
    console.error('Failed to set role:', err);
  }
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem('nuba_auth_token');
    localStorage.removeItem('nuba_user_role');
  } catch (err) {
    console.error('Failed to remove auth:', err);
  }
}

// ── HTTP Request Helper ───────────────────────────────────────────────

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers,
    });
  } catch (networkError: any) {
    throw new Error(
      `Gagal terhubung ke server. Periksa koneksi internet Anda. (${networkError.message})`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request gagal (HTTP ${response.status})`
    );
  }

  return data as T;
}

// ── Exported API Client ───────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
