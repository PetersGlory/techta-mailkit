"use strict";

const RETRYABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ESOCKET",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

function isRetryableError(err) {
  if (err && err.code && RETRYABLE_CODES.has(err.code)) return true;
  if (err && err.message) {
    const msg = err.message.toLowerCase();
    if (msg.includes("connection") && (msg.includes("timeout") || msg.includes("reset") || msg.includes("refused"))) return true;
    if (msg.includes("socket") && msg.includes("hang")) return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, { attempts = 1, delay = 1000 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) break;
      if (!isRetryableError(err)) throw err;
      await sleep(delay * Math.pow(2, i));
    }
  }
  lastError.attempts = attempts;
  throw lastError;
}

module.exports = { withRetry, isRetryableError };
