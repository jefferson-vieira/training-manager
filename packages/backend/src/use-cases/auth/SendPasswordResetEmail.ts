import { env } from '../../config/env.js';
import { buildResetPasswordEmail } from '../../emails/reset-password.js';
import { prisma } from '../../lib/db.js';
import { sendEmail } from '../../lib/email.js';
import { logger } from '../../lib/logger.js';

interface InputDto {
  email: string;
  name: string;
  resetUrl: string;
  token: string;
  userId: string;
}

export class SendPasswordResetEmail {
  async execute({ email, name, resetUrl, token, userId }: InputDto) {
    const credential = await prisma.account.findFirst({
      select: {
        id: true,
      },
      where: {
        providerId: 'credential',
        userId,
      },
    });

    // better-auth sends the link to any existing user, and its reset endpoint
    // would then create a password credential from scratch. That would turn the
    // flow into "set a password for your Google account", which the product
    // deliberately does not offer.
    if (!credential) {
      logger.info(
        { event: 'password_reset.skipped_no_credential', userId },
        'Password reset requested for an account without a password; no email sent',
      );

      return;
    }

    const message = buildResetPasswordEmail({
      email,
      logoUrl: env.EMAIL_LOGO_URL,
      name,
      resetUrl,
      supportUrl: env.EMAIL_SUPPORT_URL,
    });

    void sendEmail({
      ...message,
      event: 'password_reset',
      idempotencyKey: `password-reset/${userId}-${token.slice(0, 8)}`,
      to: email,
      userId,
    });
  }
}
