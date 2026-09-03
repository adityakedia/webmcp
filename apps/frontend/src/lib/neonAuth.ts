import { createInternalNeonAuth } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim();

/** True only when the URL looks like an https endpoint, not a DB connection string. */
const isValidAuthUrl = authUrl?.startsWith('https://') && !authUrl.includes('@');

/**
 * Official Neon Auth client. Intentionally null until a valid auth URL is
 * configured. A database connection string is NOT an auth URL — it must be
 * the Neon Auth service endpoint.
 */
const neonAuthInstance = isValidAuthUrl
  ? createInternalNeonAuth(authUrl, { adapter: BetterAuthReactAdapter() })
  : null;
export const neonAuth = neonAuthInstance?.adapter ?? null;

export async function getNeonJwt(): Promise<string | null> {
  if (!neonAuthInstance) return null;
  try {
    return (await neonAuthInstance.getJWTToken()) ?? null;
  } catch {
    return null;
  }
}
