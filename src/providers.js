"use strict";

const PROVIDERS = {
  resend: {
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    authUser: "resend",
  },
  sendgrid: {
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    authUser: "apikey",
  },
  postmark: {
    host: "smtp.postmarkapp.com",
    port: 587,
    secure: false,
    authUser: null,
  },
  ses: {
    host: "email-smtp.us-east-1.amazonaws.com",
    port: 587,
    secure: false,
    authUser: null,
  },
  mailgun: {
    host: "smtp.mailgun.org",
    port: 587,
    secure: false,
    authUser: null,
  },
};

function resolveProviderConfig(config) {
  const provider = PROVIDERS[config.provider];
  if (!provider) {
    throw new Error(
      `[MailKit] Unknown provider "${config.provider}". Supported: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return {
    host: provider.host,
    port: provider.port,
    secure: provider.secure,
    username: provider.authUser ?? config.apiKey,
    password: config.apiKey,
  };
}

module.exports = { PROVIDERS, resolveProviderConfig };
