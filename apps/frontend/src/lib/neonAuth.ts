import { createInternalNeonAuth } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim();

/** Official Neon Auth client. It is intentionally undefined until configured. */
const neonAuthInstance = authUrl
  ? createInternalNeonAuth(authUrl, { adapter: BetterAuthReactAdapter() })
  : null;
export const neonAuth = neonAuthInstance?.adapter ?? null;

export async function getNeonJwt(): Promise<string | null> {
  if (!neonAuth) return null;
  return neonAuthInstance?.getJWTToken() ?? null;
}
