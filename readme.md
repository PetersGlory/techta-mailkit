# @techtas/mailkit

A zero-config nodemailer wrapper with environment-aware setup.

- **`test` mode** → uses your personal [Resend](https://resend.com) SMTP credentials — no extra config needed
- **`production` mode** → accepts any SMTP provider (Postmark, SendGrid, AWS SES, your own server, etc.)

Never set up nodemailer boilerplate again.

---

## Install

```bash
npm install @techtas/mailkit nodemailer
```

---

## Quick Start

### Test mode (Resend)

```ts
import { createMailer } from "@techtas/mailkit";

const mailer = createMailer({
  env: "test",
  resendApiKey: process.env.RESEND_API_KEY!,
  from: "you@yourdomain.com", // must be verified in Resend
});

await mailer.send({
  to: "recipient@example.com",
  subject: "Hello from MailKit",
  html: "<p>It works!</p>",
});
```

### Production mode (any SMTP)

```ts
import { createMailer } from "@techtas/mailkit";

const mailer = createMailer({
  env: "production",
  host: process.env.SMTP_HOST!,
  port: 587,
  secure: false,
  username: process.env.SMTP_USER!,
  password: process.env.SMTP_PASS!,
  from: "noreply@yourdomain.com",
});

await mailer.send({
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome aboard</h1>",
});
```

### Environment-driven setup (recommended pattern)

```ts
import { createMailer, MailKitConfig } from "@techtas/mailkit";

const config: MailKitConfig =
  process.env.NODE_ENV === "production"
    ? {
        env: "production",
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        username: process.env.SMTP_USER!,
        password: process.env.SMTP_PASS!,
        from: process.env.MAIL_FROM!,
      }
    : {
        env: "test",
        resendApiKey: process.env.RESEND_API_KEY!,
        from: process.env.MAIL_FROM!,
      };

export const mailer = createMailer(config);
```

---

## API

### `createMailer(config)` / `new MailKit(config)`

| Field          | Type                     | Required  | Description                             |
| -------------- | ------------------------ | --------- | --------------------------------------- |
| `env`          | `"test" \| "production"` | ✅        | Switches between Resend and custom SMTP |
| `resendApiKey` | `string`                 | test only | Your Resend API key                     |
| `host`         | `string`                 | prod only | SMTP host                               |
| `port`         | `number`                 | prod only | Default: `587`                          |
| `secure`       | `boolean`                | prod only | Default: auto (true if port 465)        |
| `username`     | `string`                 | prod only | SMTP username                           |
| `password`     | `string`                 | prod only | SMTP password                           |
| `from`         | `string`                 | ✅        | Default sender address                  |
| `pool`         | `boolean`                | prod only | Enable connection pooling               |

---

### `mailer.send(payload): Promise<SendMailResult>`

| Field         | Type                 | Required | Description            |
| ------------- | -------------------- | -------- | ---------------------- |
| `to`          | `string \| string[]` | ✅       | Recipient(s)           |
| `subject`     | `string`             | ✅       | Email subject          |
| `html`        | `string`             | one of   | HTML body              |
| `text`        | `string`             | one of   | Plain-text body        |
| `from`        | `string`             |          | Override default from  |
| `cc`          | `string \| string[]` |          | CC recipients          |
| `bcc`         | `string \| string[]` |          | BCC recipients         |
| `replyTo`     | `string`             |          | Reply-to address       |
| `attachments` | `Attachment[]`       |          | Nodemailer attachments |

Returns `{ success: boolean, messageId?: string, error?: string }`.

---

### `mailer.sendBulk(payloads[]): Promise<SendMailResult[]>`

Send multiple emails sequentially. Returns results in the same order.

```ts
await mailer.sendBulk([
  { to: "a@example.com", subject: "Hi A", text: "Hey" },
  { to: "b@example.com", subject: "Hi B", text: "Hey" },
]);
```

---

### `mailer.verify(): Promise<boolean>`

Verify SMTP connection on startup. Good for catching misconfiguration early.

```ts
const ok = await mailer.verify();
if (!ok) process.exit(1);
```

---

### `mailer.close()`

Close pooled connections during graceful shutdown (only needed when `pool: true`).

---

## Environment Variables Reference

```env
# Test
RESEND_API_KEY=re_xxxxxxxxxxxx
MAIL_FROM=you@yourdomain.com

# Production
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxx
MAIL_FROM=noreply@yourdomain.com
```

---

## License

MIT — built by [Techta](https://peter-dev.lovable.app)
