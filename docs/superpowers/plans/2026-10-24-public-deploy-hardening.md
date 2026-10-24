# FinVn Public Deployment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public FinVn web app authenticate every user, isolate database records, encrypt bank credentials at rest, persist CRUD operations, and deploy with explicit production secrets and HTTPS.

**Architecture:** Google ID tokens are verified against the configured client ID, then exchanged for revocable opaque sessions held in PostgreSQL and delivered in secure cookies. All API ownership derives from that session. Bank credentials are AES-256-GCM encrypted with versioned keys supplied outside the database; PostgreSQL becomes the source of truth for account and transaction CRUD.

**Tech Stack:** FastAPI, PostgreSQL/psycopg2, PyCryptodome AES-GCM, Google Auth Python library, React/TypeScript, Vite, Docker.

**Spec:** `docs/superpowers/specs/2026-10-24-public-web-security-design.md`

## Global Constraints

- Never trust `user_id` from query strings or request bodies for authenticated operations.
- No default database or encryption secrets; production must fail closed when required secrets/config are absent.
- Never return, log, or store plaintext bank passwords or Google ID tokens in browser storage.
- Preserve existing PostgreSQL records: first produce a backup and a privacy-safe ownership report; do not remap or delete records in this change.
- Keep existing bank adapters and Google sign-in UX; preserve autosync using backend-encrypted credentials.
- Do not push or deploy as part of implementation.

## Review Focus

- Missing, expired, revoked, or forged sessions must receive 401 on every protected route.
- Cross-user account/transaction IDs must never read or mutate another user's records.
- Invalid Google audience/issuer/expiry and unverified email must not create a session.
- Ciphertext tampering, unknown key version, or missing encryption key must fail closed without exposing credential material.
- Database errors, malformed date filters, oversized migration input, and unrecognized account references must not report false success or silently misassign data.

---

### Task 1: Test Harness and Explicit Runtime Configuration

**Files:**
- Create: `backend/requirements-dev.txt`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_config_security.py`
- Modify: `backend/app/db.py`, `backend/requirements.txt`, `.env.example`, `frontend/web/.env.example`

**Interfaces:** Define validated settings for `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `SESSION_TTL_IDLE_SECONDS`, `SESSION_TTL_ABSOLUTE_SECONDS`, and `BANK_CREDENTIALS_KEYRING`; no insecure defaults for production secrets.

- [ ] Add isolated pytest/FastAPI test dependencies and fixtures that do not contact real bank APIs or the user's database.
- [ ] Add failing tests for missing DB password, missing Google client ID, malformed keyring, and valid local settings.
- [ ] Remove the hard-coded DB password fallback and fail at startup with a safe configuration error.
- [ ] Run `python -m pytest backend/tests/test_config_security.py -q` and confirm all cases pass.

### Task 2: Google Verification and Revocable Server Sessions

**Files:**
- Create: `backend/tests/test_auth_sessions.py`
- Create or modify: `backend/app/auth.py`
- Modify: `backend/app/main.py`, `backend/app/db.py`, `sql/init_postgres.sql`, `backend/requirements.txt`

**Interfaces:** `verify_google_credential(credential: str) -> VerifiedGoogleUser`; `create_session(user_id: str) -> tuple[str, datetime]`; `require_current_user(request: Request) -> AuthenticatedUser`; `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/logout` use secure cookies and server session records.

- [ ] Add failing tests for bad `aud`, `iss`, expiry, `email_verified`, missing cookie, expired session, revoked session, and successful login/logout.
- [ ] Verify Google JWT signature/claims with `google-auth`; do not use tokeninfo as the production verifier.
- [ ] Add idempotent PostgreSQL session schema storing only SHA-256 session-token hashes; implement 12-hour idle and 7-day absolute expiry.
- [ ] Set `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`; issue and validate session-bound CSRF tokens for state-changing routes and validate Origin.
- [ ] Replace `/api/auth/me?user_id=...` with identity derived from the validated cookie.
- [ ] Run `python -m pytest backend/tests/test_auth_sessions.py -q`.

### Task 3: Enforce Ownership on Every Data and Bank API

**Files:**
- Create: `backend/tests/test_api_ownership.py`
- Modify: `backend/app/main.py`, `backend/app/db.py`

**Interfaces:** Every protected route receives `current_user: AuthenticatedUser = Depends(require_current_user)`; DB account and transaction operations always include `current_user.id` in ownership predicates. Remove request/body/query `user_id` fields from public contracts.

- [ ] Add failing API tests proving unauthenticated reads/writes return 401 and cross-user account/transaction IDs return 404 without mutation.
- [ ] Protect bank connect, transaction history, sync, account CRUD, transaction CRUD, migration, profile, and browser-ID write endpoints.
- [ ] Verify account ownership before sync, transaction insert/update/delete, and credential access.
- [ ] Add request bounds for transaction limits and migration collection sizes; reject unknown account mapping instead of assigning to the first account.
- [ ] Replace raw adapter/database exception details with safe client messages and server-side redacted logs.
- [ ] Run `python -m pytest backend/tests/test_api_ownership.py -q` and the backend test suite.

### Task 4: Encrypted Bank Credentials and Preserved Autosync

**Files:**
- Create: `backend/tests/test_bank_credential_crypto.py`
- Create: `backend/app/credentials.py`
- Modify: `backend/app/main.py`, `backend/app/db.py`, `sql/init_postgres.sql`, `frontend/web/src/services/bankApi.ts`, `frontend/web/src/services/storage.ts`, `frontend/web/src/components/accounts/SyncBankModal.tsx`, `frontend/web/src/App.tsx`

**Interfaces:** `encrypt_bank_credentials(user_id, account_id, value) -> EncryptedCredential`; `decrypt_bank_credentials(...) -> BankCredentials`; authenticated save/delete endpoints; autosync accepts only account ID and loads/decrypts that user's credential on the server.

- [ ] Add failing crypto tests for round-trip, ciphertext/tag/AAD tamper, wrong account/user, missing key, and unknown key version.
- [ ] Add versioned credential schema and AES-256-GCM encryption using a 32-byte keyring from platform secrets; use user/account as authenticated additional data.
- [ ] Verify bank credentials before storing; never return ciphertext/plaintext to frontend or log request bodies. Keep decrypted values only for the duration of a bank call.
- [ ] Replace frontend credential localStorage with authenticated server storage; remove plaintext credential migration and ensure logout clears only UI state, not saved encrypted backend credentials.
- [ ] Keep periodic autosync via backend saved-credential route; rate-limit per account and serialize duplicate concurrent syncs.
- [ ] Run `python -m pytest backend/tests/test_bank_credential_crypto.py -q` plus frontend build.

### Task 5: PostgreSQL as the Source of Truth for CRUD

**Files:**
- Create: `backend/tests/test_data_crud.py`
- Modify: `backend/app/main.py`, `backend/app/db.py`, `frontend/web/src/services/dataService.ts`, `frontend/web/src/App.tsx`

**Interfaces:** Add owner-scoped account update and manual transaction create/update/delete APIs; backend transaction operations update account balances atomically. Frontend uses cookie/CSRF-aware `apiFetch` and updates cache only after successful server responses.

- [ ] Add failing tests for persisted account edits, manual income/expense create, category/note update, delete with balance reversal, transaction ownership, and DB failure.
- [ ] Implement parameterized DB operations in transactions; prevent balance and ledger updates from partially committing.
- [ ] Remove silent local-only fallback for writes; surface API errors and keep cached state unchanged on failed writes.
- [ ] Remove unauthenticated local-to-DB auto-migration. Provide an authenticated, bounded, idempotent migration endpoint only if legacy browser data still needs import.
- [ ] Run `python -m pytest backend/tests/test_data_crud.py -q` and frontend build.

### Task 6: Safe Legacy Database Report and Production Deployment

**Files:**
- Create: `backend/scripts/report_legacy_data.py`
- Create: `backend/tests/test_legacy_report.py`
- Modify: `backend/Dockerfile`, `.env.example`, `frontend/web/.env.example`, `docs/HUONG_DAN_CAI_DAT.md`, `README.md`, `sql/init_postgres.sql`

- [ ] Add a read-only report for backup verification, row counts by user, demo-user presence, orphaned references, and credential rows; do not include PII, transaction text, account numbers, or secrets.
- [ ] Test report output against synthetic fixtures; confirm it never mutates rows.
- [ ] Add explicit production configuration checks, HTTPS/reverse-proxy guidance, least-privilege PostgreSQL role guidance, secret-manager instructions, encrypted backup guidance, exact CORS allowlist, rate limiting, and disable Swagger/OpenAPI in production.
- [ ] Fix container/database instructions so Docker does not use `localhost` for an external DB and no required secret is omitted.
- [ ] Run backend tests, `python -m compileall backend/app backend/tests`, `npm run build`, `npm run lint`, dependency audit when network is available, and Docker build when daemon is available.
- [ ] Run `git diff --check` and inspect the exact staged-file candidate list; do not stage `.env`, `.env.local`, DB dumps, or personal data.

