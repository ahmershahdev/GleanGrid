# Security Policy

GleanGrid stores people's names, phone numbers, addresses and order history, so we take security reports seriously and appreciate responsible disclosure.

## Supported versions

| Version | Supported |
|---|---|
| `main` branch / the live site at gleangrid.ahmershah.dev | ✅ |
| Older commits, forks and self-hosted copies | ❌ — please reproduce on `main` first |

## Reporting a vulnerability

**Please do not open a public GitHub issue, pull request or discussion for security problems.**

Report privately by either:

- **GitHub:** *Security → Report a vulnerability* on this repository (private advisory), or
- **E-mail:** **support@ahmershah.dev** with the subject `SECURITY: <short summary>`.

Include as much as you can:

- the affected URL, route or file, and the type of issue (e.g. IDOR, XSS, CSRF bypass, SQL injection, auth bypass);
- step-by-step reproduction, with the account role you used;
- the impact you believe it has;
- any proof-of-concept (screenshots or a short video are fine — no need for a weaponised exploit).

## What to expect

| Step | Target time |
|---|---|
| Acknowledgement of your report | within **3 working days** |
| Initial assessment and severity | within **7 days** |
| Fix for critical / high issues | as fast as possible, normally within **30 days** |
| Public credit (if you want it) | in the release notes once fixed |

We'll keep you updated, and we won't take legal action against good-faith research that follows this policy.

## Scope

**In scope:** the GleanGrid application code in this repository and the site at `gleangrid.ahmershah.dev`.

**Out of scope:**

- denial-of-service or load testing, spam, or social engineering of staff, farmers or customers;
- physical attacks and attacks on third-party services (Google reCAPTCHA, Resend, OpenStreetMap, hosting provider);
- reports from automated scanners without a demonstrated impact;
- missing best-practice headers that have no practical exploit;
- rate-limit bypass that only affects your own account;
- the published demo accounts (`*@gleangrid.test`) — their passwords are public on purpose.

## Safe-harbour rules for researchers

- Use the demo accounts or accounts you created yourself. **Never access, modify or delete other people's data.** If you reach real personal data, stop and report it.
- Don't degrade the service for others, and don't run tests against production that place real orders at real farmers' stalls.
- Give us a reasonable time to fix the issue before disclosing it.

## How GleanGrid is protected

A summary of the defences already in place (details in the README's *Security* section):

- Argon2id password hashing, account + IP lockout, named rate limiters on every public write.
- Six-digit e-mail verification codes (hashed, single-use, time- and attempt-limited), new-device sign-in alerts, session revocation.
- Nonce-based Content-Security-Policy with `strict-dynamic`, HSTS, `frame-ancestors`, `nosniff`, strict referrer and permissions policies.
- CSRF tokens on every state change; the only exemption is the signed Resend webhook (HMAC + 5-minute replay window).
- Role and ownership checks on every private route; server-side price, stock, coupon and capacity calculation with row-level locks.
- Uploads decoded and re-encoded server-side with random names; SVG rejected.
- Honeypot, time trap and Google reCAPTCHA v3/v2 on public forms.
- CI runs `composer audit` and `npm audit` on every push.
