# ResumeAI4u — Environment Variables Reference

This document catalogs all environment variables used across the frontend and backend applications, aligned with the actual runtime implementation and `.env.example` templates.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | No | `development` | Set to `production` in production environments (enables strict HSTS and secure cookies). |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:3000,http://localhost:5173,http://localhost:5174` (dev) / `https://resumeai4u.vercel.app` (prod) | Comma-separated list of allowed CORS origins (e.g., `https://resumeai4u.vercel.app,https://app.resumeai4u.com`). |
| `TRUST_PROXY_HOPS` | No | `0` | Number of reverse proxy hops (set to `1` when behind Vercel, Cloudflare, Render, or AWS ALB). |
| `MONGODB_URI` | Yes (in prod) | — | MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/resumeai`). Special characters in password must be percent-encoded (`@` as `%40`). Required in production; dev/test falls back to memory mode if unset. |
| `AUTH_ACCESS_TOKEN_SECRET` | Yes | — | Cryptographically random secret (min 32 bytes) for signing HMAC JWT access tokens. |
| `AUTH_TOKEN_ISSUER` | No | `resumeai4u-api` | JWT issuer (`iss`) claim identifier. |
| `AUTH_TOKEN_AUDIENCE` | No | `resumeai4u-web` | JWT audience (`aud`) claim identifier. |
| `AUTH_COOKIE_SAME_SITE` | No | `lax` | SameSite cookie attribute (`lax`, `strict`, or `none`). Note: `none` requires `NODE_ENV=production`. |
| `AUTH_COOKIE_DOMAIN` | No | `undefined` | Domain for session cookies (omit in local development; set to `.yourdomain.com` for cross-subdomain sharing). |
| `GROQ_API_KEY` | Yes | — | API key for Groq Cloud LLM acceleration. |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Primary Groq model for resume analysis, ATS scoring, and bullet optimization (falls back to `llama-3.1-8b-instant`, `mixtral-8x7b-32768`). |
| `RAZORPAY_KEY_ID` | Yes | — | Razorpay merchant public key for order creation. |
| `RAZORPAY_KEY_SECRET` | Yes | — | Razorpay merchant secret key for HMAC signature verification. |
| `APP_ORIGIN` | Yes (for auth emails) | `http://localhost:3000` | Public base URL of the frontend application used to generate email verification and password reset links (e.g., `https://resumeai4u.vercel.app`). Must use HTTPS in production. |
| `SMTP_HOST` | Yes (for auth emails) | — | Hostname for transactional email SMTP server (e.g., `smtp.sendgrid.net`, `smtp.mailgun.org`). |
| `SMTP_PORT` | No | `587` | Port for SMTP server (`587` for TLS or `465` for SSL). |
| `SMTP_SECURE` | No | `false` | Set to `true` when using direct SSL port 465. |
| `SMTP_USER` | Yes (for auth emails) | — | SMTP username or API key. |
| `SMTP_PASSWORD` | Yes (for auth emails) | — | SMTP password or API secret. |
| `EMAIL_FROM` | Yes (for auth emails) | — | Sender email address (e.g., `noreply@resumeai4u.com`). |

---

## 2. Frontend Environment Variables (`.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `VITE_BACKEND_URL` | No | `""` (empty) | In development, leave blank to use the Vite local proxy (`/api` -> `http://localhost:5000`). In production, set to your backend origin (e.g., `https://api.resumeai4u.com`). |
| `VITE_RAZORPAY_KEY_ID` | Yes | `rzp_test_...` | Razorpay publishable key passed to the Razorpay Checkout client-side modal. |

---

## 3. Security Guidelines for Secrets

1. **Never Commit Secrets**: Ensure `.env` files are ignored in `.gitignore`. Only `.env.example` templates should be version-controlled.
2. **Key Rotation**:
   - Access token secrets (`AUTH_ACCESS_TOKEN_SECRET`) should be rotated periodically.
   - If an access token secret is rotated, active access tokens expire within 15 minutes, prompting users to automatically refresh using their opaque refresh token.
3. **URL Percent Encoding**:
   - In MongoDB URIs, special characters such as `@`, `:`, `/`, `?`, or `#` in passwords must be percent-encoded (`@` becomes `%40`, `:` becomes `%3A`).
