# IBUVIO Pay: security design & audit

This document maps every item of the requested security checklist to concrete code, and records the
results of the audit performed while building the app. **No software can honestly be called
"unhackable".** The goal is defence in depth, secure defaults, and fast detection. Before a real launch,
get an independent penetration test and complete RBI/NPCI compliance (PA/PSP guidelines, CERT-In
reporting, data localisation).

## Checklist

| # | Requirement | How it is handled | Code / evidence |
|---|---|---|---|
| 1 | **Hide API keys** | No secrets in source. Backend reads every secret from env vars. The mobile app contains **no secrets at all** (only the public API URL); the SMS key is sent in a header server-side, never to the phone. | `application.yml`, `backend/.env.example`, `mobile/.env.example` |
| 2 | **Check env variables** | `StartupSecurityValidator` refuses to boot if `JWT_SECRET` < 64 bytes, `APP_ENCRYPTION_KEY` ≠ 32 bytes, `APP_HMAC_KEY` < 32 bytes, OTPs would be logged, SMS URL isn't https, DB has no TLS, or CORS uses `*`/http in prod. The default profile is `prod`. | `config/StartupSecurityValidator.java`, `StartupSecurityValidatorTest` |
| 3 | **Protect admin routes** | Three layers: URL rule `hasRole('ADMIN')`, `@PreAuthorize` on the controller, optional `ADMIN_ALLOWED_IPS` allowlist (returns 404 to others). The ADMIN role can only be set directly in the DB, never via the API. All admin actions are audited; phone numbers are masked. | `SecurityConfig`, `AdminController`, `AdminIpAllowlistFilter` |
| 4 | **Proper authentication** | Two-factor login: OTP (SIM possession) + 6-digit MPIN. OTPs: 6 digits from `SecureRandom`, stored as HMAC, 5 min TTL, 5 attempts, 30 s resend cooldown, 5/hour. MPIN: 5 failures → 30 min lock. HS512 JWT access tokens (15 min) validated for signature, expiry, issuer, audience. Refresh tokens are random 256-bit, stored hashed, rotated on every use, bound to device ID; **reuse of an old token revokes the whole session family**. "Logout everywhere" invalidates access tokens instantly via a token version. No user enumeration (identical responses for registered/unregistered numbers, dummy hash compare). | `auth/*`, `JwtService`, `UserJwtAuthenticationConverter`, `AuthFlowTest` |
| 5 | **Access control** | Deny-by-default (`anyRequest().denyAll()`). Every repository query is scoped by the authenticated user ID (`findByIdAndUserId`…), so guessing another user's IDs returns 404 (IDOR-proof). Roles come from the DB on every request, not from the token. | `SecurityConfig`, repositories, `PaymentFlowTest.usersCannotSeeOrUseEachOthersData` |
| 6 | **Sanitize forms** | Allow-list regexes on every input (`InputRules`): names, notes, VPA, IFSC, GSTIN, amounts, PINs. Unicode letters allowed (Tamil/Hindi) but `< > " \` ;` and control chars rejected. Mobile mirrors the same rules and strips disallowed chars as you type. UPI QR codes are strictly parsed (duplicate params, non-INR currency, bad encoding → rejected). | `common/InputRules.java`, `mobile/src/lib/validation.ts`, `mobile/src/lib/upiQr.ts` |
| 7 | **XSS protection** | JSON-only API, no HTML rendering, strict input allow-lists, `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`. React Native renders text, not HTML; no WebViews. CSV export neutralises formula injection. | `SecurityConfig`, `ShopService.csv` |
| 8 | **Rate limiting** | Token buckets: auth 10/min per IP, payments 20/min per user, general 120/min per user. OTP-level limits on top. (Per instance: use Redis or the API gateway for multi-instance deployments.) | `RateLimitFilter`, `AuthFlowTest.authEndpointsAreRateLimited` |
| 9 | **Secure API endpoints** | Mandatory `Idempotency-Key` on payments (no double debits), pessimistic row locks in a stable order (no race/deadlock), all checks before any balance change, UPI PIN required for payments and balance, 3 wrong UPI PINs → 24 h block, per-txn/daily limits and a ₹5,000 first-24h cooling limit for new accounts, PINs sent only in POST bodies (never URLs/logs). | `PaymentService`, `SandboxPspGateway`, `PaymentFlowTest` |
| 10 | **CORS settings** | Native apps don't need CORS, so it is **closed by default**. Only explicitly listed https origins (e.g. an admin console) are allowed; no credentials. | `SecurityConfig.corsConfigurationSource`, `AuthFlowTest.corsOnlyAllowsConfiguredOrigins` |
| 11 | **Security headers** | HSTS (1 year, subdomains, preload), CSP, X-Frame-Options DENY, nosniff, Referrer-Policy no-referrer, Permissions-Policy, COOP/CORP, `Cache-Control: no-store`. | `SecurityConfig`, `AuthFlowTest.securityHeadersArePresentAndErrorsLeakNothing` |
| 12 | **Debug mode off** | Backend: stack traces/messages never included in errors, whitelabel off, only `/actuator/health` exposed, generic error bodies, `prod` default profile, dev OTP logger can't load in prod. Mobile: release builds strip all `console.*` (babel), `__DEV__`-only localhost URL, https enforced, cleartext traffic disabled, `allowBackup=false`. | `application.yml`, `GlobalExceptionHandler`, `babel.config.js`, `app.json`, `api/config.ts` |
| 13 | **Update dependencies** | Latest stable at build time: Spring Boot 4.1.1, Java 21, Bouncy Castle 1.86, Expo SDK 57 / RN 0.86. Dependabot for Maven, npm, Actions, Docker. Weekly OWASP Dependency-Check. | `pom.xml`, `package.json`, `.github/dependabot.yml`, `.github/workflows/security.yml` |
| 14 | **Remove unused packages** | Backend has only required starters (no Lombok, no devtools, H2 is test-scope). Mobile: Expo template extras removed. Each dependency is used by a screen or a security feature. | `pom.xml`, `mobile/package.json` |
| 15 | **Check exposed files** | Static resource serving disabled, unknown paths denied (`/.env` → 401), actuator locked down, `.gitignore`/`.dockerignore` exclude env files, keys and build output, Docker image has only the jar and runs as non-root with a read-only FS. | `application.yml`, `.gitignore`, `backend/Dockerfile`, `docker-compose.yml` |
| 16 | **Secure database** | Flyway-owned schema (`ddl-auto=validate`), JPA parameter binding / Criteria (no string SQL; LIKE wildcards escaped), TLS required in prod, **least-privilege roles**: app user can't run DDL and can't UPDATE/DELETE the audit log (verified on PostgreSQL 16). Bank account numbers encrypted with AES-256-GCM; only last 4 digits are stored in clear. DB port bound to localhost in compose. | `deploy/postgres/init-roles.sql`, `db/vendor/postgresql/V2__restrict_audit_log.sql`, `CryptoService` |
| 17 | **Hash passwords** | MPIN and (sandbox) UPI PIN: **Argon2id** (19 MiB, 2 iterations, 16-byte salt). OTPs and refresh tokens: HMAC-SHA256 with a server key. Constant-time comparisons. Weak PINs (123456, 1111, sequences) rejected. | `HashingConfig`, `PinPolicy`, `CryptoService` |
| 18 | **Scan git for leaked secrets** | gitleaks runs on every push/PR over the full history, with custom rules for IBUVIO secret names. Test keys are generated at runtime, so nothing key-like is committed. Local scan of this repo: **no leaks found**. | `.gitleaks.toml`, `.github/workflows/security.yml` |
| 19 | **Full security audit** | This document, plus CodeQL (security-extended) for Java and TypeScript, OWASP Dependency-Check, npm audit, and 40 backend tests including security tests. | `.github/workflows/*`, `backend/src/test` |

### Web build (Vercel)
* Served by unprivileged nginx with CSP `default-src 'self'; script-src 'self'` (no inline scripts),
  `connect-src 'self'` (the API is same-origin under `/api`), HSTS, `X-Frame-Options: DENY`, nosniff,
  `Referrer-Policy: no-referrer`, Permissions-Policy limiting camera/mic to the app itself.
* Session token in `sessionStorage` (survives refresh, cleared when the tab closes, never in
  `localStorage`); only the device id, last phone number and theme are kept in `localStorage`.
* The API trusts the client IP only from Vercel's `x-real-ip` header (`CLIENT_IP_HEADER`), so rate
  limits apply per real client, not per proxy.
* Native-only protections (biometrics, FLAG_SECURE, TLS pinning) are not available in browsers.

### Mobile-specific protections
* Refresh token in iOS Keychain / Android Keystore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, excluded from backups); access token in memory only.
* Optional biometric unlock (`requireAuthentication`), auto-lock after 60 s in background.
* Screenshots/screen recording blocked (FLAG_SECURE); iOS app-switcher snapshot blurred.
* Optional TLS public-key pinning (`EXPO_PUBLIC_TLS_PINS`, two pins required).
* Sensitive Android permissions (SMS, contacts, location, overlay, storage) explicitly blocked.
* Payee name for QR / typed UPI IDs always comes from the server lookup, never from the QR (anti-spoofing); unknown payees get an extra confirmation.

## Audit results (October 2026)

| Check | Result |
|---|---|
| Backend tests (H2) | 40/40 passing |
| End-to-end on PostgreSQL 16 | register → link → pay → round-up → shop auto-booking → GST → voice → request: all passing; app role denied `DELETE audit_logs` and `DROP TABLE` |
| gitleaks (working tree) | no leaks found |
| Mobile typecheck + unit tests | passing (QR tampering, input limits, weak PINs) |
| Release bundles | Android + iOS Hermes bundles build |
| `npm audit --omit=dev` | **28 advisories (18 high, 10 moderate), 0 critical**, all in Expo/Metro **build tooling** (`braces`, `micromatch`, `node-forge`, `xcode`/`uuid`, `metro`), plus `decode-uri-component` via `expo-router` (malformed deep-link DoS, client-side). The latest published versions of `braces` and `node-forge` are still flagged, so no fix exists yet. These packages don't ship in the app's runtime bundle (except the deep-link parser). Dependabot will pick up fixes; CI fails on any **critical** advisory. |

## Known limitations / before going live
1. **Sandbox PSP.** Balances are simulated. Live UPI needs a sponsor bank, NPCI certification, and NPCI's Common Library so the UPI PIN never touches IBUVIO servers (`PspGateway`).
2. **Rate limits are per instance.** Back them with Redis or enforce at the gateway/WAF when scaling out.
3. **Device integrity.** Add Play Integrity / App Attest checks and root/jailbreak detection.
4. **Key management.** Move secrets to a KMS/secret manager (AWS KMS, GCP Secret Manager, Vault) and plan key rotation (support multiple JWT keys via `kid`).
5. **Monitoring.** Ship audit logs to a SIEM; alert on `REFRESH_REUSE_DETECTED`, `ACCOUNT_LOCKED` spikes and admin actions.
6. **Legal.** Replace the placeholder Privacy Policy / Terms (`info.tsx`) with lawyer-reviewed text (DPDP Act 2023).
7. **Independent penetration test** before handling real money.

## Reporting a vulnerability
Email security@ibuvio.app (set this up) with steps to reproduce. Please do not open public issues for security bugs.
