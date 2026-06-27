# @techtas/mailkit

> Zero-config nodemailer wrapper with environment-aware SMTP setup. Built by [TechtaCloud](https://github.com/PetersGlory).

[![npm version](https://img.shields.io/npm/v/@techtas/mailkit)](https://www.npmjs.com/package/@techtas/mailkit)
[![npm downloads](https://img.shields.io/npm/dw/@techtas/mailkit)](https://www.npmjs.com/package/@techtas/mailkit)
[![license](https://img.shields.io/npm/l/@techtas/mailkit)](./LICENSE)

Never set up nodemailer boilerplate again. One install, one config object, done.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
  - [v1.0.0 — Core Mailer](#v100--core-mailer-done-)
  - [v1.1.0 — Named Providers + Retry Logic](#v110--named-providers--retry-logic)
  - [v1.2.0 — HTML Template Engine](#v120--html-template-engine)
  - [v2.0.0 — Webhook Tracking](#v200--webhook-tracking)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install @techtas/mailkit nodemailer
```

> `nodemailer` is a peer dependency — you install it alongside the package.

---

## Quick Start

### Test mode (Resend SMTP)

```js
const { createMailer } = require("@techtas/mailkit");

const mailer = createMailer({
  env: "test",
  resendApiKey: process.env.RESEND_API_KEY,
  from: "you@yourdomain.com",
});

await mailer.send({
  to: "recipient@example.com",
  subject: "Hello from MailKit",
  html: "<p>It works!</p>",
});
```

### Production mode (any SMTP provider)

```js
const { createMailer } = require("@techtas/mailkit");

const mailer = createMailer({
  env: "production",
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  username: process.env.SMTP_USER,
  password: process.env.SMTP_PASS,
  from: "noreply@yourdomain.com",
});

await mailer.send({
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome aboard</h1>",
});
```

### Recommended pattern — environment-driven singleton

```js
// lib/mailer.js
const { createMailer } = require("@techtas/mailkit");

const mailer = createMailer(
  process.env.NODE_ENV === "production"
    ? {
        env: "production",
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        username: process.env.SMTP_USER,
        password: process.env.SMTP_PASS,
        from: process.env.MAIL_FROM,
      }
    : {
        env: "test",
        resendApiKey: process.env.RESEND_API_KEY,
        from: process.env.MAIL_FROM,
      }
);

module.exports = mailer;
```

Import it anywhere in your app:

```js
const mailer = require("./lib/mailer");

await mailer.send({ to: "...", subject: "...", html: "..." });
```

---

## API Reference

### `createMailer(config)` / `new MailKit(config)`

Creates a mailer instance. Accepts a single config object.

**Test mode config:**

| Field | Type | Required | Description |
|---|---|---|---|
| `env` | `"test"` | ✅ | Enables Resend SMTP mode |
| `resendApiKey` | `string` | ✅ | Your Resend API key |
| `from` | `string` | ✅ | Sender address (must be verified in Resend) |

**Production mode config:**

| Field | Type | Required | Description |
|---|---|---|---|
| `env` | `"production"` | ✅ | Enables custom SMTP mode |
| `host` | `string` | ✅ | SMTP host |
| `port` | `number` | | Default: `587` |
| `secure` | `boolean` | | Default: auto (true if port 465) |
| `username` | `string` | ✅ | SMTP username |
| `password` | `string` | ✅ | SMTP password |
| `from` | `string` | ✅ | Default sender address |
| `pool` | `boolean` | | Enable connection pooling. Default: `false` |

---

### `mailer.send(payload)`

Send a single email. Returns a `Promise<SendMailResult>`.

```js
const result = await mailer.send({
  to: "user@example.com",          // string or string[]
  subject: "Hello",
  html: "<p>Hello</p>",            // html or text required
  text: "Hello",
  from: "override@yourdomain.com", // optional: overrides default from
  cc: "cc@example.com",
  bcc: "bcc@example.com",
  replyTo: "reply@example.com",
  attachments: [],                 // nodemailer attachments array
});

// result: { success: true, messageId: "<abc@example.com>" }
// result: { success: false, error: "..." }
```

---

### `mailer.sendBulk(payloads[])`

Send multiple emails sequentially. Returns `Promise<SendMailResult[]>` in the same order as input.

```js
const results = await mailer.sendBulk([
  { to: "a@example.com", subject: "Hi A", text: "Hey" },
  { to: "b@example.com", subject: "Hi B", text: "Hey" },
  { to: "c@example.com", subject: "Hi C", html: "<b>Hey</b>" },
]);
```

> Runs sequentially by design to avoid SMTP rate-limit errors.

---

### `mailer.verify()`

Verify SMTP connection. Call on app startup to catch misconfiguration before the first send.

```js
const ok = await mailer.verify();
if (!ok) {
  console.error("Mail server unreachable");
  process.exit(1);
}
```

---

### `mailer.environment`

Returns the current environment: `"test"` or `"production"`.

```js
console.log(mailer.environment); // "test"
```

---

### `mailer.close()`

Close pooled SMTP connections. Call during graceful shutdown when `pool: true`.

```js
process.on("SIGTERM", () => {
  mailer.close();
  process.exit(0);
});
```

---

## Environment Variables

```env
# Test mode
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
MAIL_FROM=you@yourdomain.com

# Production mode
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxx
MAIL_FROM=noreply@yourdomain.com
```

---

## Roadmap

### v1.0.0 — Core Mailer _(done ✅)_

**Released.** The foundation — environment-aware nodemailer wrapper with Resend SMTP for test mode and full custom SMTP for production.

**What's included:**
- `createMailer(config)` factory + `MailKit` class
- `send()` — single email with full header support (cc, bcc, replyTo, attachments)
- `sendBulk()` — sequential multi-send with per-result status
- `verify()` — startup connection check
- `pool` support for high-volume production use
- JSDoc types for IntelliSense without TypeScript

**Install:**
```bash
npm install @techtas/mailkit nodemailer
```

---

### v1.1.0 — Named Providers + Retry Logic

**Status: planned**

Right now production mode requires you to know the SMTP host, port, and secure settings for your provider. v1.1.0 removes that friction with named provider adapters — and adds automatic retry so transient failures don't silently drop emails.

#### Named provider adapters

Pass a `provider` name and just your API key. MailKit resolves the SMTP config internally.

```js
// Before (v1.0.0)
createMailer({
  env: "production",
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  username: "apikey",
  password: process.env.SENDGRID_API_KEY,
  from: "noreply@yourdomain.com",
});

// After (v1.1.0)
createMailer({
  env: "production",
  provider: "sendgrid",
  apiKey: process.env.SENDGRID_API_KEY,
  from: "noreply@yourdomain.com",
});
```

**Supported providers at launch:**

| Provider | `provider` value |
|---|---|
| Resend | `"resend"` |
| SendGrid | `"sendgrid"` |
| Postmark | `"postmark"` |
| AWS SES | `"ses"` |
| Mailgun | `"mailgun"` |
| Custom SMTP | `"smtp"` (existing behavior) |

#### Retry logic

Transient SMTP failures (timeouts, connection resets) are common. v1.1.0 adds automatic retry with exponential backoff, configurable per-mailer.

```js
createMailer({
  env: "production",
  provider: "sendgrid",
  apiKey: process.env.SENDGRID_API_KEY,
  from: "noreply@yourdomain.com",
  retry: {
    attempts: 3,      // total attempts (including first)
    delay: 1000,      // base delay in ms (doubles each retry)
  },
});
```

Retry behavior:
- Attempt 1 → fails → wait 1000ms
- Attempt 2 → fails → wait 2000ms
- Attempt 3 → fails → returns `{ success: false, error: "..." }`

Only network/transport errors trigger retry. Invalid recipients, auth failures, and validation errors fail immediately.

**`SendMailResult` in v1.1.0:**
```js
{
  success: false,
  error: "Connection timeout",
  attempts: 3  // how many attempts were made
}
```

#### Development guide for v1.1.0

**Provider map structure** (`src/providers.js`):
```js
const PROVIDERS = {
  resend: {
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    authUser: "resend",        // fixed username
    authPassField: "apiKey",   // which config field holds the password
  },
  sendgrid: {
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    authUser: "apikey",
    authPassField: "apiKey",
  },
  postmark: {
    host: "smtp.postmarkapp.com",
    port: 587,
    secure: false,
    authUser: null,            // null = use apiKey as both user and pass
    authPassField: "apiKey",
  },
  // ...
};
```

**Retry wrapper** (`src/retry.js`):
```js
async function withRetry(fn, { attempts = 1, delay = 1000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await sleep(delay * Math.pow(2, i));
    }
  }
}
```

**Breaking changes:** none. Existing `host/port/username/password` config still works. `provider` is additive.

---

### v1.2.0 — HTML Template Engine

**Status: planned**

Instead of building HTML strings manually in every project, v1.2.0 lets you register named templates and pass variables. MailKit handles rendering.

#### Usage

```js
// Register templates once (e.g. in lib/mailer.js)
mailer.registerTemplate("welcome", {
  subject: "Welcome to {{appName}}, {{name}}!",
  html: `
    <h1>Welcome, {{name}}!</h1>
    <p>Click below to verify your email.</p>
    <a href="{{verifyLink}}">Verify Email</a>
  `,
});

mailer.registerTemplate("otp", {
  subject: "Your OTP code",
  html: `<p>Your code is <strong>{{code}}</strong>. Expires in {{expiresIn}}.</p>`,
});

// Send using template name
await mailer.send({
  to: "user@example.com",
  template: "welcome",
  data: {
    appName: "MyApp",
    name: "Peter",
    verifyLink: "https://myapp.com/verify?token=abc123",
  },
});
```

#### Built-in templates

MailKit ships with ready-to-use base templates you can use immediately or override:

| Template name | Use case |
|---|---|
| `mailkit:welcome` | New user welcome + email verify link |
| `mailkit:otp` | One-time password / verification code |
| `mailkit:reset-password` | Password reset link |
| `mailkit:invoice` | Basic invoice with line items |
| `mailkit:notification` | Generic notification with title + body |

```js
await mailer.send({
  to: "user@example.com",
  template: "mailkit:otp",
  data: { code: "482910", expiresIn: "10 minutes" },
});
```

#### File-based templates

For more complex layouts, load templates from `.html` files:

```js
mailer.loadTemplatesFrom("./emails"); // loads all .html files in the folder
```

```
emails/
  welcome.html
  invoice.html
  otp.html
```

Each file can use `{{variable}}` mustache-style interpolation.

#### Development guide for v1.2.0

**Template registry** (`src/templates.js`):
```js
class TemplateRegistry {
  constructor() {
    this._templates = new Map();
    this._loadBuiltins();
  }

  register(name, { subject, html, text }) {
    this._templates.set(name, { subject, html, text });
  }

  render(name, data = {}) {
    const tpl = this._templates.get(name);
    if (!tpl) throw new Error(`[MailKit] Template "${name}" not found.`);
    return {
      subject: interpolate(tpl.subject, data),
      html: tpl.html ? interpolate(tpl.html, data) : undefined,
      text: tpl.text ? interpolate(tpl.text, data) : undefined,
    };
  }
}

function interpolate(str, data) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}
```

**`send()` change** — detect `template` field and resolve before sending:
```js
async send(payload) {
  if (payload.template) {
    const rendered = this._templates.render(payload.template, payload.data);
    payload = { ...payload, ...rendered };
  }
  // existing send logic...
}
```

**Breaking changes:** none. `html`/`text` direct sends still work unchanged.

---

### v2.0.0 — Webhook Tracking

**Status: planned**

Track email opens, link clicks, bounces, and unsubscribes. v2.0.0 ships in two tiers:

- **Provider-native tracking** — delegate to Resend/SendGrid's built-in tracking via their APIs (fast to ship, provider-specific)
- **Self-hosted tracking** — MailKit injects a tracking pixel and wraps links itself (provider-agnostic, requires a small HTTP server)

#### Provider-native tracking (Resend)

```js
// Get events for a sent email
const events = await mailer.getEvents(messageId);

// events:
// [
//   { type: "delivered", timestamp: "2024-01-01T10:00:00Z" },
//   { type: "opened",    timestamp: "2024-01-01T10:05:00Z" },
//   { type: "clicked",   url: "https://myapp.com", timestamp: "..." },
// ]
```

#### Webhook listener (self-hosted tracking)

```js
// Express integration
const { createTrackingRouter } = require("@techtas/mailkit/tracking");

app.use("/mail/track", createTrackingRouter({
  secret: process.env.MAILKIT_WEBHOOK_SECRET,
  onOpen: ({ messageId, timestamp, ip }) => {
    console.log("Email opened:", messageId);
  },
  onClick: ({ messageId, url, timestamp }) => {
    console.log("Link clicked:", url);
  },
  onBounce: ({ messageId, reason }) => {
    console.log("Bounced:", reason);
  },
  onUnsubscribe: ({ email }) => {
    // remove from your list
  },
}));
```

#### Link tracking

When tracking is enabled, MailKit wraps all links in sent HTML emails through a redirect URL that logs the click before forwarding:

```js
createMailer({
  env: "production",
  provider: "sendgrid",
  apiKey: process.env.SENDGRID_API_KEY,
  from: "noreply@yourdomain.com",
  tracking: {
    enabled: true,
    baseUrl: "https://yourapp.com/mail/track", // your tracking endpoint
    secret: process.env.MAILKIT_WEBHOOK_SECRET,
  },
});
```

Original link: `https://myapp.com/dashboard`
Wrapped link: `https://yourapp.com/mail/track/click?mid=abc&url=aHR0cHM6...&sig=xxx`

#### Open tracking

A 1×1 transparent pixel is injected at the bottom of every HTML email:

```html
<img src="https://yourapp.com/mail/track/open?mid=abc&sig=xxx" width="1" height="1" />
```

#### Development guide for v2.0.0

**Tracking module structure:**
```
src/
  tracking/
    index.js        ← createTrackingRouter() export
    pixel.js        ← inject open-tracking pixel into HTML
    links.js        ← wrap links in HTML with redirect URLs
    hmac.js         ← sign/verify tracking URLs to prevent spoofing
    providers/
      resend.js     ← Resend Events API adapter
      sendgrid.js   ← SendGrid Activity API adapter
```

**HMAC signing** (prevents fake open/click requests):
```js
const crypto = require("crypto");

function signTrackingUrl(params, secret) {
  const payload = new URLSearchParams(params).toString();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function verifyTrackingUrl(params, sig, secret) {
  const expected = signTrackingUrl(params, secret);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
```

**Pixel injection** (`src/tracking/pixel.js`):
```js
function injectPixel(html, trackingUrl) {
  const pixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}
```

**Breaking changes in v2.0.0:**
- `send()` gains an optional `tracking` override (per-send disable)
- `SendMailResult` gains optional `trackingId` field
- Tracking router is a separate entry point (`@techtas/mailkit/tracking`) — no bundle size impact if unused

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss.

```bash
git clone https://github.com/PetersGlory/techta-mailkit
cd techta-mailkit
npm install
```

Run the smoke test:
```bash
npm test
```

---

## License

MIT — built by [TechtaCloud](https://github.com/PetersGlory)