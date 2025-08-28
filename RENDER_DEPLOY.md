### RoomSync Backend on Render (Quick Guide)

This guide covers deploying the backend API to Render using the included Dockerfile and blueprint.

### What’s already set up
- Dockerfile at `backend/Dockerfile`
- Public health check `GET /healthz`
- Render blueprint at `render.yaml`

### Quick deploy via Blueprint
1) Push latest changes to your default branch.
2) In Render: New → Blueprint → select your repo/branch → Apply.
3) In the generated service, set required env vars (those marked `sync: false`).
4) Deploy and verify health check.

### Manual deploy (without blueprint)
1) Render → New → Web Service → “Build & Deploy from a repository” → select your repo/branch.
2) Runtime: Docker.
3) Health check path: `/healthz`.
4) Auto deploy: on.
5) Set environment variables (below), then deploy.

### Environment variables (required/recommended)
- Required
  - `MONGO_URI`: MongoDB connection string
  - `JWT_SECRET`: Strong random secret for JWT signing
- Recommended
  - `ALLOWED_ORIGINS`: `*` or CSV (e.g. `https://app.example.com,https://admin.example.com`)
  - `TRUST_PROXY`: `true` (Render is behind a proxy)
  - `ENFORCE_HTTPS`: `true`
  - `RATE_LIMIT_WINDOW_MS`: `900000`
  - `RATE_LIMIT_MAX`: `300`
- Optional
  - `CLOUDINARY_URL`: Cloudinary URL if media uploads are used
  - `OPENAI_API_KEY`: Enable schedule OCR feature
  - `PORT`: `4000` (default; Dockerfile exposes 4000)

### Verify after deploy
- Open service URL `/healthz` → should respond `{ ok: true }`.
- Test auth flow with `/auth/register` and `/auth/login`.
- Check logs in Render dashboard.

### Checklist (production)
- `JWT_SECRET` is long and random
- `ALLOWED_ORIGINS` restricted where possible
- `TRUST_PROXY=true` and `ENFORCE_HTTPS=true`
- MongoDB not publicly exposed; use managed provider
- Rate limits set to suit expected traffic

### Notes
- CORS and Socket.io respect `ALLOWED_ORIGINS`.
- Background notification scheduler runs automatically in production.
- Access logs use `combined` format in production; app errors avoid leaking sensitive details in responses.

### Troubleshooting
- 401 Unauthorized: verify `Authorization: Bearer <token>` and matching `JWT_SECRET`
- CORS errors: adjust `ALLOWED_ORIGINS`
- Proxy/rate-limit warnings: ensure `TRUST_PROXY=true` 