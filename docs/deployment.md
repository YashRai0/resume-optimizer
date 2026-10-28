# ResumeAI4u — Production Deployment Guide

This guide details deployment procedures for hosting the ResumeAI4u frontend on Vercel and the backend on Node.js container or cloud platforms (e.g., Render, Railway, AWS ECS, or Fly.io).

---

## 1. Architecture Topology

```
             ┌─────────────────────────────┐
             │       Users / Browsers      │
             └──────────────┬──────────────┘
                            │
              ┌─────────────┴─────────────┐
              │ HTTPS                     │ HTTPS
              ▼                           ▼
    ┌────────────────────┐      ┌─────────────────────────┐
    │  Vercel Frontend   │      │  Backend (Cloud/Docker) │
    │(resumeai4u.vercel) │      │ (api.resumeai4u.com)    │
    └────────────────────┘      └────────────┬────────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
              ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
              │  MongoDB Atlas  │   │  Groq AI Cloud  │   │ Razorpay / SMTP │
              └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 2. Frontend Deployment (Vercel)

1. **Framework Preset**: Vite
2. **Root Directory**: `.` (project root)
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_BACKEND_URL`: `https://api.resumeai4u.com` (leave blank only if using reverse proxy rewrite)
   - `VITE_RAZORPAY_KEY_ID`: Your live Razorpay public key (`rzp_live_...`)
6. **SPA Rewrites**:
   The `vercel.json` in the root repository automatically handles client-side routing:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## 3. Backend Deployment (Render / Railway / Docker)

### 3.1 Node Environment Requirements
- Engine: Node.js `>= 20.0.0`
- Startup command: `npm start` (which runs `node server.js`)
- Root directory for backend service: `backend`

### 3.2 Required Environment Configuration
Ensure all required variables listed in [docs/environment-variables.md](file:///c:/resume-optimizer/docs/environment-variables.md) are configured:
- Set `NODE_ENV=production` (activates HSTS and strict cookie settings).
- Set `ALLOWED_ORIGINS=https://resumeai4u.vercel.app,https://app.resumeai4u.com`.
- Set `TRUST_PROXY_HOPS=1` (when deployed behind Render or cloud reverse proxies).
- Set `APP_ORIGIN=https://resumeai4u.vercel.app` (must match the public frontend HTTPS origin).
- Set `AUTH_COOKIE_SAME_SITE=lax` (or `none` if frontend and backend are on completely different domains; `none` requires `NODE_ENV=production`).
- Set `AUTH_COOKIE_DOMAIN=.resumeai4u.com` if using sibling subdomains (e.g., `app.resumeai4u.com` and `api.resumeai4u.com`).

### 3.3 Database & DNS Whitelisting
- In MongoDB Atlas Network Access, whitelist the outgoing IP addresses of your backend deployment (or allow `0.0.0.0/0` with strong authentication credentials).
- Ensure your host environment supports DNS SRV resolution (`mongodb+srv://`).

---

## 4. Post-Deployment Verification

1. **Health Check**:
   ```bash
   curl -i https://api.resumeai4u.com/
   # Expect HTTP 200: {"status":"OK","message":"ResumeAI Backend Service Active"}
   ```
2. **Security Headers**:
   Verify response headers include:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
3. **CORS Validation**:
   Send an `OPTIONS` preflight request with an unauthorized origin and confirm it is rejected:
   ```bash
   curl -i -X OPTIONS https://api.resumeai4u.com/api/csrf -H "Origin: https://malicious-site.com"
   ```
4. **End-to-End Auth & Optimize**:
   Perform a test registration, email verification, resume upload, and optimization to ensure the worker threads and Groq API keys are functioning properly.
