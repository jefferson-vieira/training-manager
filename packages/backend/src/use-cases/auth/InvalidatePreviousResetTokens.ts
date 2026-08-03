import { prisma } from '../../lib/db.js';

interface InputDto {
  keepToken?: string;
  userId: string;
}

const IDENTIFIER_PREFIX = 'reset-password:';

// better-auth stores one verification row per issued token and never removes the
// older ones — its only bulk cleanup deletes already-expired rows. Without this,
// a link requested earlier keeps working after a reset, which would defeat
// resetting the password to lock an attacker out.
export class InvalidatePreviousResetTokens {
  async execute({ keepToken, userId }: InputDto) {
    await prisma.verification.deleteMany({
      where: {
        identifier: {
          startsWith: IDENTIFIER_PREFIX,
        },
        value: userId,
        ...(keepToken && {
          NOT: {
            identifier: `${IDENTIFIER_PREFIX}${keepToken}`,
          },
        }),
      },
    });
  }
}
