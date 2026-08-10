import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import {
  deleteObject,
  isOwnedAvatarUrl,
  keyFromPublicUrl,
} from '../../lib/storage.js';

interface InputDto {
  userId: string;
}

export class RemoveUserImage {
  async execute({ userId }: InputDto) {
    const user = await prisma.user.findUnique({
      select: {
        image: true,
      },
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.image) {
      return;
    }

    await prisma.user.update({
      data: {
        image: null,
      },
      where: {
        id: userId,
      },
    });

    await this.deleteObject({
      image: user.image,
      userId,
    });
  }

  private async deleteObject({
    image,
    userId,
  }: {
    image: string;
    userId: string;
  }) {
    if (!isOwnedAvatarUrl(image)) {
      return;
    }

    try {
      await deleteObject(keyFromPublicUrl(image));
    } catch (error) {
      logger.error(
        { err: error, event: 'avatar.delete_failed', userId },
        'Failed to delete removed avatar object',
      );
    }
  }
}
