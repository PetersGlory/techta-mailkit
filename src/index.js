"use strict";

const nodemailer = require("nodemailer");
const { resolveProviderConfig } = require("./providers");
const { withRetry } = require("./retry");

/**
 * @typedef {"test" | "production"} MailEnvironment
 */

/**
 * @typedef {Object} TestConfig
 * @property {"test"} env
 * @property {string} resendApiKey - Your Resend API key
 * @property {string} from - Sender address (must be verified in Resend)
 */

/**
 * @typedef {Object} ProductionConfig
 * @property {"production"} env
 * @property {string} [provider] - Named provider (resend, sendgrid, postmark, ses, mailgun)
 * @property {string} [apiKey] - API key for the named provider
 * @property {string} [host] - SMTP host (unused when provider is set)
 * @property {number} [port=587] - SMTP port (unused when provider is set)
 * @property {boolean} [secure] - true for port 465, false for others (unused when provider is set)
 * @property {string} [username] - SMTP username (unused when provider is set)
 * @property {string} [password] - SMTP password (unused when provider is set)
 * @property {string} from - Default sender address
 * @property {boolean} [pool=false] - Enable connection pooling
 * @property {RetryConfig} [retry] - Automatic retry on transport errors
 */

/**
 * @typedef {Object} RetryConfig
 * @property {number} [attempts=1] - Total send attempts (including first)
 * @property {number} [delay=1000] - Base delay in ms (doubles each retry)
 */

/**
 * @typedef {TestConfig | ProductionConfig} MailKitConfig
 */

/**
 * @typedef {Object} SendMailPayload
 * @property {string | string[]} to - Recipient(s)
 * @property {string} subject - Email subject
 * @property {string} [text] - Plain-text body
 * @property {string} [html] - HTML body
 * @property {string} [from] - Override default sender
 * @property {string | string[]} [cc]
 * @property {string | string[]} [bcc]
 * @property {string} [replyTo]
 * @property {any[]} [attachments] - Nodemailer attachments
 */

/**
 * @typedef {Object} SendMailResult
 * @property {boolean} success
 * @property {string} [messageId]
 * @property {string} [error]
 * @property {number} [attempts] - How many send attempts were made (only when retry is configured)
 */

class MailKit {
  /**
   * @param {MailKitConfig} config
   */
  constructor(config) {
    this._env = config.env;
    this._defaultFrom = config.from;
    this._retry = config.retry || null;

    if (config.env === "test") {
      this._transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: config.resendApiKey,
        },
      });
    } else {
      const smtp = config.provider
        ? resolveProviderConfig(config)
        : config;

      this._transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port ?? 587,
        secure: smtp.secure ?? smtp.port === 465,
        auth: {
          user: smtp.username,
          pass: smtp.password,
        },
        pool: config.pool ?? false,
      });
    }
  }

  /**
   * Verify SMTP connection. Call on app startup to catch misconfiguration early.
   * @returns {Promise<boolean>}
   */
  async verify() {
    try {
      await this._transporter.verify();
      return true;
    } catch (err) {
      console.error("[MailKit] Connection verification failed:", err);
      return false;
    }
  }

  /**
   * Send a single email.
   * @param {SendMailPayload} payload
   * @returns {Promise<SendMailResult>}
   */
  async send(payload) {
    const { to, subject, text, html, from, cc, bcc, replyTo, attachments } =
      payload;

    if (!text && !html) {
      return {
        success: false,
        error: "Either `text` or `html` must be provided.",
      };
    }

    const sendFn = () =>
      this._transporter.sendMail({
        from: from ?? this._defaultFrom,
        to: Array.isArray(to) ? to.join(", ") : to,
        cc,
        bcc,
        replyTo,
        subject,
        text,
        html,
        attachments,
      });

    try {
      const info = this._retry
        ? await withRetry(sendFn, this._retry)
        : await sendFn();

      return { success: true, messageId: info.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[MailKit] Send failed:", message);
      return {
        success: false,
        error: message,
        attempts: err.attempts || 1,
      };
    }
  }

  /**
   * Send multiple emails sequentially.
   * Returns results in the same order as input payloads.
   * @param {SendMailPayload[]} payloads
   * @returns {Promise<SendMailResult[]>}
   */
  async sendBulk(payloads) {
    const results = [];
    for (const payload of payloads) {
      results.push(await this.send(payload));
    }
    return results;
  }

  /**
   * Current environment ("test" or "production")
   * @returns {MailEnvironment}
   */
  get environment() {
    return this._env;
  }

  /**
   * Close pooled connections during graceful shutdown.
   * Only needed when pool: true.
   */
  close() {
    this._transporter.close();
  }
}

/**
 * Create a MailKit instance.
 * @param {MailKitConfig} config
 * @returns {MailKit}
 */
function createMailer(config) {
  return new MailKit(config);
}

module.exports = { MailKit, createMailer };
