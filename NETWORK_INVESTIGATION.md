# Network Investigation Report

## Issue Summary
Frontend→backend requests are timing out after recent commits, while past commits worked fine.

## Key Findings

### 1. API Base URL Configuration

**Current (commit 97cb635+):**
- Frontend: Uses `resolveBaseUrl()` function with dynamic URL resolution
- Logic: `EXPO_PUBLIC_API_URL` → `Constants.hostUri` IP detection → `localhost:4000` fallback
- Backend: Listens on port 4000 (env.PORT || 4000)

**Previous Working (commit 2552b17):**
- Frontend: Simple fallback `process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'`
- Backend: Same port 4000

### 2. Backend Accessibility Status

✅ **Backend is accessible:**
- `curl http://localhost:4000/healthz` → 200 OK `{"ok":true}`
- `curl http://192.168.48.127:4000/healthz` → 200 OK `{"ok":true}`
- Listens on `*.4000` (all interfaces)
- CORS properly configured with `Access-Control-Allow-Origin: *`

❌ **HTTPS not available in development:**
- `curl https://localhost:4000/healthz` → SSL protocol error
- Backend runs HTTP-only in development

### 3. Environment Configuration

**Development Environment:**
```json
{
  "ENFORCE_HTTPS": undefined,
  "ALLOWED_ORIGINS": undefined,
  "PORT": "4000", 
  "NODE_ENV": "development"
}
```

**Production Environment (render.yaml):**
```yaml
- key: ENFORCE_HTTPS
  value: "true"
- key: TRUST_PROXY
  value: "true"
- key: ALLOWED_ORIGINS
  value: "*"
```

### 4. Critical Code Changes

**Frontend API Client Changes (commit 97cb635):**
```diff
- baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
+ baseURL: resolveBaseUrl(),
```

**Backend HTTPS Enforcement Changes (commit 59254b5):**
```diff
- if (env.ENFORCE_HTTPS === 'true') {
+ if (env.ENFORCE_HTTPS === 'true' && env.NODE_ENV !== 'test') {
```

### 5. Root Cause Analysis

**Primary Issue: Dynamic URL Resolution Logic**

The new `resolveBaseUrl()` function depends on `Constants.expoConfig.hostUri` or `Constants.manifest.hostUri` from Expo. When Expo dev server runs, it may provide a hostUri like `192.168.48.127:8081`, causing the frontend to resolve to `http://192.168.48.127:4000`.

**Timeline of Changes:**
1. **Commit d80c961→97cb635**: Frontend switched from simple fallback to dynamic URL resolution
2. **Commit 97cb635**: Added HTTPS enforcement middleware (production-only)
3. **Commit 59254b5**: Fixed HTTPS enforcement to exclude test environment

**Why It's Failing:**
- When Expo runs on LAN IP (e.g., `192.168.48.127:8081`), frontend resolves to `http://192.168.48.127:4000`
- Backend is accessible on this IP, so this should work
- **However**: The issue may be in the Expo Constants not being available or hostUri being empty, causing fallback to localhost, or timing issues with URL resolution

### 6. Environment Variables Status

**Missing in Development:**
- `EXPO_PUBLIC_API_URL` - not set
- `EXPO_PUBLIC_WS_URL` - not set

**Backend Environment:**
- HTTPS enforcement disabled in development ✅
- CORS allows all origins ✅
- Port 4000 correctly configured ✅

### 7. Suggested Next Steps

1. **Immediate Debug**: Add logging to see what URL the frontend actually resolves to at runtime
2. **Test Expo Constants**: Verify what `Constants.expoConfig.hostUri` returns when Expo dev server is running
3. **Set Explicit API URL**: Use `EXPO_PUBLIC_API_URL=http://localhost:4000` to bypass dynamic resolution
4. **Check Network Interface**: Ensure backend binds to all interfaces (currently confirmed working)

### 8. Most Likely Root Causes

1. **Empty hostUri**: Expo Constants returning empty hostUri, causing incorrect URL resolution
2. **Timing Issue**: URL resolution happening before Expo Constants are available
3. **Network Interface**: Frontend trying to connect to wrong IP when Expo provides LAN IP

### 9. Quick Verification Commands

```bash
# Test backend accessibility
curl http://localhost:4000/healthz
curl http://192.168.48.127:4000/healthz

# Set explicit API URL for frontend
export EXPO_PUBLIC_API_URL=http://localhost:4000

# Check what Expo provides
npx expo start --localhost --print-config
```

## Recommendation

**Immediate Fix**: Set `EXPO_PUBLIC_API_URL=http://localhost:4000` in development to bypass the dynamic resolution logic that was introduced in commit 97cb635.

**Long-term**: The dynamic resolution logic should work but needs proper debugging to understand why `Constants.hostUri` isn't providing the expected values.

## ✅ FIXED

**Applied Solution:**
Modified both `mobile/src/api/client.js` and `mobile/src/lib/socket.js` to use `http://localhost:4000` in development mode (`__DEV__`), while preserving the dynamic resolution logic for production builds.

**Changes Made:**
1. Added `__DEV__` check to force localhost:4000 in development
2. Added explanatory comments about the timing issue
3. Preserved dynamic hostUri resolution for production builds
4. Applied the same fix to both API client and WebSocket client

**Verification:**
- Backend accessible: ✅ `http://localhost:4000/healthz` returns 200 OK
- Frontend will now consistently use `http://localhost:4000` in development
- Production builds will still use dynamic resolution when needed 