import { env } from '../../config/env.js';
import { buildPasswordChangedEmail } from '../../emails/password-changed.js';
import { sendEmail } from '../../lib/email.js';

interface InputDto {
  email: string;
  name: string;
  userId: string;
}

export class SendPasswordChangedEmail {
  execute({ email, name, userId }: InputDto) {
    const message = buildPasswordChangedEmail({
      email,
      logoUrl: env.EMAIL_LOGO_URL,
      name,
      supportUrl: env.EMAIL_SUPPORT_URL,
    });

    void sendEmail({
      ...message,
      event: 'password_changed',
      idempotencyKey: `password-changed/${userId}-${Date.now()}`,
      to: email,
      userId,
    });
  }
}
