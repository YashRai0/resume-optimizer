# ResumeAI4u — Developer Setup & Contribution Guide

## 1. Prerequisites

- **Node.js**: `v20.x` or higher (Active LTS or Current, e.g., Node v24.x)
- **npm**: `v10.x` or higher
- **MongoDB**: MongoDB Atlas cluster or local MongoDB instance (v6.0+)
- **Operating System**: macOS, Linux, or Windows (PowerShell)

---

## 2. Quick Start

### 2.1 Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url> resume-optimizer
cd resume-optimizer

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2.2 Configure Environment Variables

1. Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
2. Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Fill in the required secrets (see [docs/environment-variables.md](file:///c:/resume-optimizer/docs/environment-variables.md) for variable specifications).

---

## 3. Running Locally

### 3.1 Start the Backend Server

```bash
cd backend
npm start
# Server starts on http://localhost:5000 (or PORT specified in backend/.env)
```

For live reloading during development:
```bash
cd backend
node --watch server.js
```

### 3.2 Start the Frontend Development Server

In a separate terminal:
```bash
npm run dev
# Vite dev server starts on http://localhost:5173 (or next available port)
```

---

## 4. Testing & Verification

### 4.1 Backend Test Suite

The backend uses Node's native test runner (`node:test`). Tests cover security invariants, rate limits, token rotations, archive parsers, AI prompt isolation, and payment ledgers.

```bash
cd backend
npm test
```

### 4.2 Frontend Production Build

Test the production Vite bundle:

```bash
npm run build
```

This generates optimized distribution assets in `dist/`.

---

## 5. Engineering Standards & Conventions

1. **Layering & Separation of Concerns**:
   - Routes define endpoints and apply middleware only.
   - Controllers unpack parameters and orchestrate responses.
   - Services perform business logic, database mutations, and third-party API calls.
   - Models define Mongoose schemas and indexes.
2. **Security by Default**:
   - Never log raw resume contents or prompts. Always route errors through `safeErrorLog.js`.
   - Never send stack traces or internal DB errors to the client.
   - Validate all file uploads with magic bytes, not just file extensions.
   - Enforce CSRF headers on all state-changing endpoints.
3. **Module Format**:
   - Use ES Modules (`import` / `export`) consistently across frontend and backend.
