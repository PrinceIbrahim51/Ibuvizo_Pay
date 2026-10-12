# IBUVIO Pay

A UPI payments app for **Android and iOS** (React Native + Expo) with a **Java 21 / Spring Boot 4** backend, built around the USP

> **"UPI for Small Shops + Auto Accounting + Voice in Local Language"** + **Smart Savings round-up**

UI follows the IBUVIO design mockups in [`design/`](design/) (Login, Home, Send Money, Scan & Pay, Transactions, Bank Accounts, Profile).

| | |
|---|---|
| USP & roadmap | [docs/USP.md](docs/USP.md) |
| Security design & audit | [docs/SECURITY.md](docs/SECURITY.md) |

> ⚠️ **Sandbox mode.** Payments move *simulated* money. Real UPI requires an NPCI-certified sponsor (PSP) bank. Plug its APIs into `backend/src/main/java/com/ibuvio/pay/bank/PspGateway.java`.

## Features

**Payments:** OTP + MPIN sign-in, biometric unlock, link bank accounts (UPI PIN), check balance, send to UPI ID / contact / QR (camera or gallery), bank transfer (account + IFSC), request money, transaction history with search & filters, monthly spent/received summary, receipts.

**Shop mode:** shop profile with GSTIN; every UPI payment received is auto-booked as a sale; add cash sales and expenses by tap or **voice**; daily profit/loss and 7-day chart; monthly GST (GSTR-3B style) summary; CSV ledger export.

**Voice Pay:** Tamil, Hindi, Telugu, English, e.g. *"Amma-ku ₹500 anuppu"*, *"Rahul ko 500 bhejo"*, *"ஐநூறு ரூபாய் விற்பனை"*. Always confirmed by the user; payments still need the UPI PIN.

**Smart Savings:** round up every payment to ₹10/₹50/₹100 and save the spare change into goals.

## Repository layout

```
backend/   Spring Boot API (auth, accounts, payments, savings, shop, voice, admin) + Flyway migrations
mobile/    Expo / React Native app (expo-router, TypeScript)
deploy/    PostgreSQL least-privilege role setup
design/    Original UI mockups
docs/      USP and security documentation
.github/   CI (backend, mobile), security scans (gitleaks, CodeQL, OWASP), Dependabot
```

## Run the backend locally

Requirements: Java 21, Maven, PostgreSQL 16.

```bash
# 1. Database with least-privilege roles (run as a Postgres superuser)
psql -v owner_pw="'choose-owner-pw'" -v app_pw="'choose-app-pw'" -f deploy/postgres/init-roles.sql

# 2. Secrets (dev): generate fresh random keys, never reuse them anywhere
export SPRING_PROFILES_ACTIVE=dev OTP_SENDER=log          # dev only: OTPs are printed to the console
export DB_URL=jdbc:postgresql://localhost:5432/ibuvio
export DB_USERNAME=ibuvio_app DB_PASSWORD=choose-app-pw
export FLYWAY_USER=ibuvio_owner FLYWAY_PASSWORD=choose-owner-pw
export JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
export APP_ENCRYPTION_KEY=$(openssl rand -base64 32) APP_HMAC_KEY=$(openssl rand -base64 32)

# 3. Run
cd backend && mvn spring-boot:run
```

Tests: `cd backend && mvn verify` (uses in-memory H2; 40 tests).

Production: copy `backend/.env.example`, fill every value, use `SPRING_PROFILES_ACTIVE=prod`, a TLS database URL and an HTTPS SMS gateway. The app refuses to start otherwise. A hardened `Dockerfile` and `docker-compose.yml` are included.

**Admins:** the ADMIN role can't be granted through the API. Promote a user directly in the database:
`UPDATE users SET role = 'ADMIN' WHERE phone = '+91XXXXXXXXXX';`

## Run the mobile app

Requirements: Node 22, Android Studio and/or Xcode (the app uses native modules, so use a development build, not Expo Go).

```bash
cd mobile
npm ci
cp .env.example .env.local          # set EXPO_PUBLIC_API_URL (https in release builds)
npx expo run:android                # or: npx expo run:ios
```

In debug builds without `EXPO_PUBLIC_API_URL`, the app talks to `http://10.0.2.2:8080` (the host machine from the Android emulator).

Checks: `npx tsc --noEmit`, `npm test`. Release builds: `npx eas-cli build -p android|ios`.

## Deploy to Vercel (web app + Java API in one project)

`vercel.json` defines two [Vercel Services](https://vercel.com/docs/services), both built from Dockerfiles:

| Path | Service | Source |
|---|---|---|
| `/api/*` | Java/Spring Boot API (container) | `backend/Dockerfile` |
| everything else | Web build of the app, served by unprivileged nginx with strict security headers | `mobile/Dockerfile`, `mobile/web/nginx.conf.template` |

The web app and the API share one domain, so there's no CORS and the CSP is `connect-src 'self'`.

One-time setup in the Vercel dashboard (project **ibuvio-pay**):
1. **Database:** Storage → *Create Database* → **Neon (Postgres)** → connect it to the project. It injects
   `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, which the API reads automatically (TLS required).
2. **Environment variables** (Production): `SPRING_PROFILES_ACTIVE=staging`, `OTP_SENDER=log`,
   `CLIENT_IP_HEADER=x-real-ip`, and three random secrets `JWT_SECRET`, `APP_ENCRYPTION_KEY`,
   `APP_HMAC_KEY` (`openssl rand -base64 32` each, type *Sensitive*).
3. Redeploy. Every push to the production branch deploys automatically.

`staging` = full production hardening with **sandbox money**, and OTPs are written to the Vercel runtime
logs (visible only to you) because no SMS provider is configured yet. Before real users: set up an SMS
gateway (`OTP_SENDER=sms-gateway`, `SMS_GATEWAY_URL`, `SMS_GATEWAY_API_KEY`) and switch to
`SPRING_PROFILES_ACTIVE=prod`. The backend refuses to start with log-OTPs in `prod`.

Web vs native: the web version is for demos and desktop use. The Android/iOS apps (camera QR scanning,
biometrics, screenshot blocking, Keychain/Keystore) are built with EAS (`npx eas-cli build`).

## API overview (`/api/v1`)

| Area | Endpoints |
|---|---|
| Auth | `POST auth/otp`, `auth/register`, `auth/login`, `auth/refresh`, `auth/logout`, `auth/logout-all`, `auth/mpin/reset` |
| Profile | `GET/PATCH me`, `GET vpa/{vpa}` |
| Accounts | `GET/POST accounts`, `GET accounts/banks`, `POST accounts/{id}/balance`, `…/pin`, `…/primary`, `DELETE accounts/{id}` |
| Payments | `POST payments` (requires `Idempotency-Key`), `GET payments`, `GET payments/{id}`, `GET payments/summary`, `GET contacts/recent` |
| Requests | `POST requests`, `GET requests/incoming`, `GET requests/outgoing`, `POST requests/{id}/decline` |
| Savings | `GET/POST savings/goals`, `POST savings/goals/{id}/withdraw` |
| Shop | `GET/PUT shop/profile`, `GET/POST shop/entries`, `DELETE shop/entries/{id}`, `GET shop/summary/daily`, `GET shop/summary/range`, `GET shop/reports/gst`, `GET shop/reports/ledger.csv` |
| Voice | `POST voice/parse` |
| Admin | `GET admin/users`, `POST admin/users/{id}/freeze`, `…/unfreeze`, `…/kyc`, `GET admin/audit`, `GET admin/stats` |
