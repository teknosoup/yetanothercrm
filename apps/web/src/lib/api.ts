export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

export function setToken(token: string) {
  window.localStorage.setItem('token', token);
}

export function clearToken() {
  window.localStorage.removeItem('token');
}
