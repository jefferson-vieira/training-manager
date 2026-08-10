import { env } from '../../config/env.js';
import { InvalidFormatError } from '../../errors/InvalidFormatError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { UploadTooLargeError } from '../../errors/UploadTooLargeError.js';
import { prisma } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import {
  deleteObject,
  headObject,
  listUserKeys,
  publicUrlFor,
  readMagicBytes,
} from '../../lib/storage.js';
import { isAcceptedImageSignature } from '../../utils/image-signature.js';

interface InputDto {
  key: string;
  userId: string;
}

export class UpdateUserImage {
  async execute({ key, userId }: InputDto) {
    this.assertKeyBelongsToUser({ key, userId });

    const contentLength = await this.readSize(key);

    if (contentLength > env.AVATAR_MAX_BYTES) {
      await this.discard(key);

      throw new UploadTooLargeError();
    }

    const magicBytes = await readMagicBytes(key);

    if (!isAcceptedImageSignature(magicBytes)) {
      await this.discard(key);

      throw new InvalidFormatError('Unsupported image format');
    }

    const image = publicUrlFor(key);

    await prisma.user.update({
      data: {
        image,
      },
      where: {
        id: userId,
      },
    });

    await this.sweepSupersededObjects({
      currentKey: key,
      userId,
    });

    return {
      image,
    };
  }

  private assertKeyBelongsToUser({
    key,
    userId,
  }: {
    key: string;
    userId: string;
  }) {
    if (key.includes('..') || !key.startsWith(`${userId}`)) {
      throw new InvalidFormatError('Invalid image reference');
    }
  }

  private async discard(key: string) {
    try {
      await deleteObject(key);
    } catch (error) {
      logger.error(
        { err: error, event: 'avatar.discard_failed', key },
        'Failed to discard avatar object',
      );

      // A rejected upload that survives in the bucket costs storage but breaks
      // nothing, and the caller's error must not be replaced by this one.
      return;
    }
  }

  private async readSize(key: string) {
    try {
      const { contentLength } = await headObject(key);

      return contentLength;
    } catch {
      throw new NotFoundError('Uploaded image not found');
    }
  }

  private async sweepSupersededObjects({
    currentKey,
    userId,
  }: {
    currentKey: string;
    userId: string;
  }) {
    try {
      const keys = await listUserKeys(userId);

      const superseded = keys.filter((key) => key !== currentKey);

      await Promise.all(superseded.map((key) => deleteObject(key)));
    } catch (error) {
      logger.warn(
        { err: error, event: 'avatar.sweep_failed', userId },
        'Failed to clean up superseded avatar objects',
      );
    }
  }
}
