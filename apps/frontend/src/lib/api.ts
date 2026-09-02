const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

/** Resolve API calls to Cloud Run in production and to Vite's proxy locally. */
export function apiUrl(path: string): string {
  // Keep local development same-origin so Vite's proxy handles CORS.
  return import.meta.env.DEV || !baseUrl ? path : `${baseUrl}${path}`;
}
