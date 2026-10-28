# ResumeAI4u

ResumeAI4u is a React/Vite resume optimizer with an Express API, MongoDB persistence, Groq-powered generation, and Razorpay checkout.

## Local development

Use separate installs because the frontend and backend have independent manifests and lockfiles:

```powershell
cd C:\resume-optimizer
npm ci
Copy-Item .env.example .env
npm run dev
```

In another terminal:

```powershell
cd C:\resume-optimizer\backend
npm ci
Copy-Item .env.example .env
npm start
```

The Vite server listens on port 3000 and proxies `/api` to `http://localhost:5000`. Set `VITE_BACKEND_URL` to the API origin in the frontend deployment; keep it blank for local proxying.

Authentication requires MongoDB and `AUTH_ACCESS_TOKEN_SECRET` with at least 32 bytes of random material. Account registration and password recovery also require Resend API configuration (`RESEND_API_KEY`, `EMAIL_FROM`) and `APP_ORIGIN`; until configured, those endpoints report that email delivery is unavailable and do not issue a pretend successful flow. New users must verify their email before signing in.

The browser keeps ten-minute access JWTs in memory. A 30-day rolling refresh session is stored in MongoDB and an HttpOnly cookie. Configure exact frontend origins in `ALLOWED_ORIGINS`. For production, serve over HTTPS. If the frontend and API are cross-site, set `AUTH_COOKIE_SAME_SITE=none` and ensure the browser deployment permits the required credentialed requests; same-site custom domains are preferred.

## Configuration

Copy the example environment files and set the backend values in `backend/.env`. Do not commit `.env` files or expose backend secrets in frontend variables. `MONGODB_URI`, `GROQ_API_KEY`, Razorpay credentials, the JWT secret, and `RESEND_API_KEY` are server-side values. `VITE_RAZORPAY_KEY_ID` is a public provider key; it is not proof of payment.

## Tests

Run backend tests with:

```powershell
cd C:\resume-optimizer\backend
npm test
```

The tests cover auth helper and HTTP route behavior using an injected fake store. A MongoDB-backed staging test is still required to verify index creation and persistence across process restarts.

## Demo records

No Clerk identities, demo optimizations, or demo payment records are migrated. New Mongo-generated user IDs cannot match old Clerk subject strings, so old records do not appear in new accounts and old payment rows do not grant entitlements. Startup does not delete or clear any collection.
