# Deploy: Vercel + Cloud Run + Neon

## 1. Neon PostgreSQL

Create a Neon project and copy its pooled connection string. In Cloud Run, set
`DATABASE_URL` to that value. The application converts Neon-compatible
Postgres URLs to SQLAlchemy's async driver automatically.

## 2. Cloud Run API

Enable Artifact Registry, Cloud Build, and Cloud Run in a Google Cloud project.
Create an Artifact Registry Docker repository named `acoustom`, then run from
the repository root:

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=_REGION=us-central1
gcloud run deploy acoustom-api \
  --image us-central1-docker.pkg.dev/PROJECT_ID/acoustom/acoustom-api:COMMIT_SHA \
  --region us-central1 --allow-unauthenticated \
  --cpu 1 --memory 1Gi --concurrency 1 --timeout 300
```

Set these Cloud Run variables/secrets before sending traffic:

```text
DATABASE_URL=<Neon pooled PostgreSQL connection string>
CORS_ORIGINS=["https://YOUR_PROJECT.vercel.app","https://YOUR_DOMAIN"]
NEON_AUTH_JWKS_URL=<Neon Auth JWKS URL>
NEON_AUTH_ISSUER=<Neon Auth issuer>
NEON_AUTH_AUDIENCE=<optional audience>
```

Use Google Secret Manager for `DATABASE_URL` and the Neon Auth values. Cloud Run
provides `PORT`; the backend image reads it automatically. Generated RIR WAV
files are ephemeral on Cloud Run, which is suitable for the prototype.

## 3. Vercel frontend

Import the repository in Vercel. The root `vercel.json` already defines the
workspace install command, build command, output directory, and SPA fallback.
Set these Vercel build-time variables:

```text
VITE_API_BASE_URL=https://YOUR_CLOUD_RUN_URL
VITE_WEBMCP_ORIGIN_TRIAL_TOKEN=<only when required by your WebMCP browser rollout>
```

Deploy. The frontend sends API and generated-RIR requests to Cloud Run when
`VITE_API_BASE_URL` is set, and uses Vite's local `/api` proxy when it is not.

## Neon Auth

Enable Neon Auth in the Neon project and use the Vercel-Neon integration to
provision deployment-specific auth URLs and trusted origins. The frontend uses
the official `@neondatabase/neon-js` client and sends its JWT to Cloud Run.
Set `NEON_AUTH_JWKS_URL` (and issuer/audience when supplied) so the API verifies
Neon sessions. Set this Vercel variable too:

```text
VITE_NEON_AUTH_URL=https://...neonauth.../neondb/auth
```
