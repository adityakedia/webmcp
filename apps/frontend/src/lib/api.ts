const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

/** Resolve API calls to Cloud Run in production and to Vite's proxy locally. */
export function apiUrl(path: string): string {
  return baseUrl ? `${baseUrl}${path}` : path;
}
