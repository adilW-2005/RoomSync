### RoomSync Deployment Guide

This document explains how to deploy the backend API and the React Native (Expo) mobile app for production. It assumes Docker is available for the backend and EAS/Expo for the mobile app.

### Prerequisites
- Node.js 20+ (local dev) and npm
- Docker and Docker Compose (for backend)
- MongoDB 7+ (managed service or container)
- Cloudinary account (optional; used for media)
- OpenAI API key (optional; used for schedule OCR feature)
- Apple/Google developer accounts for mobile distribution

### Environment Variables (Backend)
Set these for the API container/process:
- MONGO_URI (required): MongoDB connection string
- JWT_SECRET (required): Strong secret for signing JWTs
- PORT (optional): API port (default 4000)
- CLOUDINARY_URL (optional): Cloudinary connection URL
- APP_SCHEME (optional): Deep link scheme for app; default roomsyncut
- DEEP_LINK_HOST (optional): Deep link host; default roomsync.local
- PUSH_ENABLED (optional): 'true' or 'false'
- ALLOWED_ORIGINS (recommended): CSV of allowed CORS origins (e.g. https://app.example.com,https://admin.example.com). Use * for any origin
- ENFORCE_HTTPS (optional): 'true' to redirect http->https (requires proxy or TLS termination)
- TRUST_PROXY (recommended when behind proxy): 'true' when using a reverse proxy (Nginx/ELB), enables correct client IP handling
- RATE_LIMIT_WINDOW_MS (optional): Window in ms (default 900000)
- RATE_LIMIT_MAX (optional): Max requests per window per IP (default 300)
- OPENAI_API_KEY (optional): Enables schedule OCR service
- GOOGLE_MAPS_API_KEY (optional): If maps integrations are used server-side

Notes:
- In production, set TRUST_PROXY=true when you run behind a load balancer/reverse proxy. If you enable ENFORCE_HTTPS, ensure TLS is terminated before the app or use a TLS-terminating proxy.
- Set ALLOWED_ORIGINS to the mobile/web origins that are allowed to call your API. For native apps, '*' is commonly acceptable, but lock down to known origins if you expose any web clients.

### Running the Backend with Docker Compose
1) Create an .env file in the repository root with production values. Example:
```bash
# .env
JWT_SECRET=replace-with-a-long-random-string
ALLOWED_ORIGINS=*
MONGO_URI=mongodb://mongo:27017/roomsync
PORT=4000
TRUST_PROXY=true
ENFORCE_HTTPS=false
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
CLOUDINARY_URL=
OPENAI_API_KEY=
```

2) Build and run:
```bash
docker compose up --build -d
```
- The compose file starts MongoDB and the API listening on port 4000.
- To view logs:
```bash
docker compose logs -f api
```
- To stop:
```bash
docker compose down
```

3) Health/Smoke test:
- Register/login via API using the mobile app pointed at the API URL or use curl/postman to hit `/auth/register` and `/auth/login`.

### Deploying the Backend without Docker
```bash
cd backend
npm ci
NODE_ENV=production PORT=4000 JWT_SECRET=... MONGO_URI=... ALLOWED_ORIGINS=* TRUST_PROXY=true node src/index.js
```
Run the process under a supervisor (systemd/pm2) and put it behind a reverse proxy that terminates TLS.

### Reverse Proxy (Nginx) Example
When running behind Nginx (recommended), enable proxy headers and TLS termination. Example:
```nginx
server {
  listen 443 ssl http2;
  server_name api.example.com;

  ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```
Set TRUST_PROXY=true on the API when using a proxy like above.

### Database
- The app auto-creates indexes via Mongoose in non-production. In production, Mongoose `autoIndex` is disabled; ensure indexes exist if you add new ones.
- Seed data: optional
```bash
cd backend
npm run seed          # populate sample data
npm run seed:wipe     # remove seeded data
```
Use only in non-production or with caution.

### Logging & Monitoring
- Access logs: morgan ('combined' in production)
- App logs: stdout/stderr; aggregate via your platform (CloudWatch, Stackdriver, ELK). Logs avoid sensitive payloads in production error responses.
- Add process-level monitoring (CPU/memory) and uptime checks.

### Mobile App Deployment (Expo)
See `docs/app-store-deploy.md` for store submission specifics. Build wiring:
- API base URL: set `EXPO_PUBLIC_API_URL` at build/runtime so the app points to your backend. Example for local dev: http://<LAN_IP>:4000
- Deep linking: scheme in `mobile/app.json` uses `roomsyncut`. If you customize scheme/host, update:
  - Backend env: APP_SCHEME, DEEP_LINK_HOST
  - Mobile: app.json scheme and any deep links used

Build with EAS:
```bash
cd mobile
npm ci
# Set the API URL for builds
echo 'EXPO_PUBLIC_API_URL=https://api.example.com' > .env
# iOS
npx expo run:ios --configuration Release --non-interactive
# Android
npx expo run:android --variant release --non-interactive
```
For cloud builds, use `eas.json`/EAS secrets and refer to Expo docs.

Permissions (already configured):
- iOS: Location usage strings and background mode for presence updates
- Android: ACCESS_COARSE/FINE/BACKGROUND_LOCATION

Push Notifications:
- The project uses `expo-notifications`. Ensure push credentials are configured in your Expo/Apple/Google accounts if enabling PUSH_ENABLED=true and implement a push delivery service/key if needed.

### Security Hardening Checklist
- Set strong JWT_SECRET and rotate if compromised
- Restrict ALLOWED_ORIGINS where possible
- Run behind HTTPS; set TRUST_PROXY=true when behind proxy; optionally set ENFORCE_HTTPS=true
- Set up firewall/security groups to allow only necessary ingress
- Ensure MongoDB is not publicly accessible without auth (use managed DB or private network)
- Review rate limit settings to suit your traffic

### CI/CD (Suggested)
- Lint and test on every PR:
```bash
cd backend && npm ci && npm run lint && npm test
cd mobile && npm ci && npm run lint && npm test
```
- Build and push backend Docker image on main branch
- Deploy container to your environment (ECS, Kubernetes, VM)
- Trigger EAS build for mobile releases

### Troubleshooting
- 401 Unauthorized: verify Authorization header is `Bearer <token>` and JWT_SECRET is consistent across services
- CORS errors: set ALLOWED_ORIGINS appropriately
- Rate limit warnings when using a proxy: set TRUST_PROXY=true
- Socket.io CORS: uses same ALLOWED_ORIGINS as HTTP

### Quick Start (Local Dev)
```bash
# Backend
cd backend
npm ci
npm run dev

# Mobile
cd ../mobile
npm ci
EXPO_PUBLIC_API_URL=http://localhost:4000 npm run start
```

### Support
- API docs: `docs/api.md`
- Data flows: `docs/data-flows.md`
- Notifications: `docs/notifications.md`
- App Store deploy notes: `docs/app-store-deploy.md` 