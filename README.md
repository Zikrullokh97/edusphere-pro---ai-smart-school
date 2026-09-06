<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# EduSphere Pro

EduSphere Pro is a single-school React/Vite school operations MVP with an Express backend, Firebase Authentication/Firestore persistence, Gemini AI routes, Google Workspace integrations, and IndexedDB offline attendance/grade sync. It intentionally does not implement multi-tenant SaaS behavior.

View your app in AI Studio: https://ai.studio/apps/20ca98f5-c83f-4336-99d3-1ec624e02267

## Run Locally

**Prerequisites:** Node.js 20+


1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, and `QR_SIGNING_SECRET`.
3. Run the app: `npm run dev`

## Architecture

The browser uses Firebase Authentication for identity. Protected requests send a Firebase ID token to Express, which verifies it with Firebase Admin, loads the user's role and school profile, and applies authorization before calling Gemini or writing Firestore data.

Attendance and grade mutations are written immediately to IndexedDB and queued for authenticated `/api/sync` persistence. The server uses Firestore transactions, version checks, audit logs, and idempotency records. Logout clears protected offline records for the current browser profile.

## Production notes

- Gemini and Firebase Admin credentials are server-only; do not add them to Vite client variables.
- QR attendance uses short-lived HMAC-signed tokens tied to school and class. The Face ID screen is a camera prototype, not biometric authentication.
- Google Workspace requests use the minimum scopes currently needed for Sheets, Docs, Contacts, Gmail send, and Gmail read.
- AI routes enforce role authorization, input limits, per-user/school rate limits, and structured response checks.
- Admin Users & Accounts supports school-scoped listing, account creation, profile/role/status updates, and secure password-reset requests. Passwords are never returned or stored in plaintext.
- The canonical application roles are `admin`, `teacher`, and `parent_student`; deputy-director/Zavuch responsibilities are implemented as admin permissions, not a separate login role.

## Verification

- `npm run lint` runs the TypeScript check.
- `npm run build` creates the Vite client and production Express bundle.
- `npm test` starts the Firestore Emulator and runs the authentication, role, ownership, attendance, grades, and audit rules tests.
- Emulator tests require Java 11+ on `PATH`.
