import { Resend } from 'resend';

import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface EmailMessage {
  html: string;
  subject: string;
  text: string;
}

type EmailPayload = {
  idempotencyKey: string;
  to: string;
} & EmailMessage;

type SendEmailInput = {
  event: string;
  userId: string;
} & EmailPayload;

const resend =
  env.EMAIL_PROVIDER === 'resend' ? new Resend(env.RESEND_API_KEY) : null;

// Neither rejects nor is meant to be awaited: the neutral confirmation shown to
// the user must not turn into an error, nor take as long as the provider does,
// or either one reveals whether the address has an account. Callers discard the
// promise with `void`, so an escaping rejection would take the process down —
// `sendWithResend` is what upholds that. The outcome is reported through
// `${event}.email_sent` / `${event}.email_failed` instead of being returned.
export async function sendEmail({ event, userId, ...payload }: SendEmailInput) {
  try {
    const messageId = resend
      ? await sendWithResend(payload)
      : sendToConsole(payload);

    logger.info(
      { event: `${event}.email_sent`, messageId, userId },
      'Email sent',
    );
  } catch (error) {
    logger.error(
      { error, event: `${event}.email_failed`, userId },
      'Failed to send email',
    );
  }
}

function sendToConsole({ html, subject, text, to }: EmailPayload) {
  logger.info({ html, subject, text, to }, 'Email (console mode, not sent)');

  return null;
}

async function sendWithResend({
  html,
  idempotencyKey,
  subject,
  text,
  to,
}: EmailPayload) {
  const { data, error } = await resend!.emails.send(
    {
      from: env.EMAIL_FROM,
      html,
      subject,
      text,
      to,
    },
    {
      idempotencyKey,
    },
  );

  if (error) {
    throw error;
  }

  return data.id;
}
