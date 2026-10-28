# ResumeAI4u — System Architecture & Design Specification

## 1. High-Level System Overview

ResumeAI4u is an AI-assisted resume optimization application. It provides estimated ATS-style matching, keyword gap analysis, AI bullet suggestions, cover letter generation, optimization history, and one-time Pro purchases that grant access for a fixed number of days. It does not implement recurring subscriptions or payment webhooks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Client Layer (React / Vite)                           │
│   Landing Page │ Auth Pages │ Dashboard Feature Modules │ Pricing Page      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON / Cookies
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Security & HTTP Gateway (Express)                        │
│   Security Headers (HSTS, CSP, nosniff) │ CORS Origin Whitelist │ Limits    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Routing & Middleware Pipeline                          │
│   Routes ──► Abuse/Rate Limits ──► Auth Verification ──► Quota Reservation  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Controller Layer                                    │
│   AuthController        │   ResumeController        │   PaymentController   │
│   - Session lifecycle   │   - Parse & Optimize      │   - Orders & Verify   │
│   - Token rotation      │   - Bullet Workbench      │   - Ledger idempotency│
└──────────────────┬───────────────────┬───────────────────┬──────────────────┘
                   │                   │                   │
                   ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Service & Worker Layer                              │
│   authStore / tokens │ parseResume (Worker Thread) │ paymentStore & ledger  │
│   emailService (SMTP)│ Groq AI API client          │ quota / counters       │
└──────────────────┬───────────────────┬───────────────────┬──────────────────┘
                   │                   │                   │
                   ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Persistence & External Services                        │
│   MongoDB Atlas (Mongoose) │ Groq AI Cloud │ Razorpay Gateway │ SMTP Host   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layered Architecture (`Route → Middleware → Validation → Controller → Service → Model`)

The backend follows strict unidirectional layering:

1. **Route Layer (`backend/routes/`)**:
   - Maps HTTP methods and URI paths.
   - Attaches rate-limiting, authentication, and validation middlewares.
   - Delegates request execution to controller functions without containing business logic.

2. **Middleware Layer (`backend/middleware/`)**:
   - `auth.js`: Verifies short-lived asymmetric/HMAC JWT access tokens, validates subject claims against active sessions, and attaches `req.user`.
   - `abuseLimits.js`: Enforces token bucket rate limits, plan entitlements, and atomic quota reservations.

3. **Validation Layer (`backend/utils/` & `shared/`)**:
   - Input sanitization and constraints: file signatures (magic bytes for PDF `%PDF-` and DOCX `PK\x03\x04`), max file length (10MB), text lengths, email formats, and password complexity.

4. **Controller Layer (`backend/controllers/`)**:
   - Orchestrates HTTP requests and responses.
   - Extracts and sanitizes request parameters.
   - Invokes domain services and handles HTTP error mapping without leaking internal implementation details.

5. **Service Layer (`backend/services/`)**:
   - Encapsulates pure business logic.
   - `parseResume.js` / `documentParserWorker.js`: Offloads CPU-intensive PDF/DOCX parsing into dedicated Node.js worker threads to prevent event loop starvation.
   - `authStore.js` & `authTokens.js`: Manages argon2id password hashing, opaque token generation, and refresh token rotation with reuse detection.
   - `commitPaymentCapture.js`: Atomic ledger state transitions preventing double-redemption of payment signatures.
   - `emailService.js`: Transactional email delivery for verification and password resets.

6. **Model Layer (`backend/models/`)**:
   - Mongoose data schemas with indexes: `AuthUser`, `AuthSession`, `AuthToken`, `Optimization`, `PaymentLedger`, and `AbuseCounter`.

---

## 3. Data Flow & Security Boundaries

### 3.1 Authentication & Session Lifecycle
- **Tokens**: Dual-token architecture with short-lived JWT access tokens (10-minute TTL) and opaque refresh tokens (30-day TTL) stored in `HttpOnly`, `Secure`-in-production cookies. `SameSite` is configurable and defaults to `Lax`.
- **CSRF Protection**: Synchronizer Token Pattern with cryptographically bound CSRF tokens checked via custom `x-csrf-token` headers on mutating requests.
- **Refresh Token Rotation**: Each token refresh issues a new opaque token and revokes the predecessor. If an invalidated refresh token is reused, the entire session family is revoked immediately.

### 3.2 Document Upload & AI Processing
- **File Validation**: Multi-layer inspection: extension check, MIME type check, magic byte verification, and zip-bomb / path-traversal prevention for DOCX archives.
- **Worker Thread Isolation**: Parsing runs in `documentParserWorker.js` with strict memory limits and a 15-second timeout.
- **Prompt Injection Defense**: User resume content and target job descriptions are placed strictly into delimited data blocks within user prompts; system prompts remain immutable and server-controlled.
- **Sanitized Logging**: All raw resume text and prompt bodies are stripped prior to error logging (`safeErrorLog.js`).

### 3.3 Payments & Entitlements
- **HMAC Verification**: Razorpay payment signatures are validated using constant-time string comparisons (`crypto.timingSafeEqual`).
- **Idempotent Ledger**: `commitPaymentCapture.js` prevents duplicate client-side verification requests from granting the same order more than once. No webhook route or recurring subscription lifecycle is currently implemented.

---

## 4. Frontend Component & State Architecture

The frontend is built on React 18, Vite, and Tailwind CSS:
- **`src/App.jsx`**: Route table and protected dashboard route.
- **`src/pages/`**: Landing, authentication, pricing, and dashboard screens. Dashboard workspace, results, upload, and history interactions currently live in `Dashboard.jsx` rather than a separate feature-module tree.
- **`src/context/AuthContext.jsx`**: First-party session state, in-memory access token, refresh, and login/logout flows. Authentication is not provided by Clerk.
- **`src/components/`**: Shared authentication shell and application error boundary.
- **`src/utils/`**: API client, auth headers, and 401 refresh retry behavior.
