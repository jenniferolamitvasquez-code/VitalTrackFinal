# VitalTrackFinal

## Deployment

This repository is a pnpm workspace with two deployable apps:

- Backend API: `artifacts/api-server`
- Frontend web app: `artifacts/vital-track`

The repo already includes `render.yaml` for Render and `vercel.json` for Vercel.

## Backend on Render

Use the repository root when connecting the project to Render. The existing `render.yaml` uses these commands:

- Build Command: `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @workspace/api-server build`
- Start Command: `corepack pnpm --filter @workspace/api-server start`
- Health Check Path: `/api/healthz`

Set these environment variables in Render:

```env
NODE_ENV=production
AUTH_MODE=local
DEFAULT_USER_ID=demo-user
MONGODB_URI=<your MongoDB Atlas connection string>
CORS_ORIGIN=<your Vercel frontend URL>
CLOUDINARY_FOLDER=vital-track
```

Optional, only needed for image uploads:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

After Render deploys, test:

```text
https://<your-render-service>.onrender.com/api/healthz
```

It should return:

```json
{"status":"ok"}
```

## Frontend on Vercel

Import the same GitHub repository in Vercel. Use the repository root and keep the existing `vercel.json`.

The existing Vercel config uses:

- Framework: Vite
- Install Command: `corepack enable && corepack pnpm install --frozen-lockfile`
- Build Command: `corepack pnpm --filter @workspace/vital-track build`
- Output Directory: `artifacts/vital-track/dist/public`

Set these environment variables in Vercel:

```env
VITE_AUTH_MODE=local
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
```

Redeploy the frontend after adding environment variables.

## Local Verification

Run the production deploy builds locally:

```bash
corepack pnpm --filter @workspace/api-server build
corepack pnpm --filter @workspace/vital-track build
```
