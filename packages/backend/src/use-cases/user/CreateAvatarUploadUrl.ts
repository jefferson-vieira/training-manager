import { randomUUID } from 'node:crypto';

import { signUpload } from '../../lib/storage.js';

interface InputDto {
  contentLength: number;
  userId: string;
}

export class CreateAvatarUploadUrl {
  async execute({ contentLength, userId }: InputDto) {
    const key = this.buildKey(userId);

    const { expiresIn, uploadUrl } = await signUpload({
      contentLength,
      contentType: 'image/webp',
      key,
    });

    return {
      expiresIn,
      key,
      uploadUrl,
    };
  }

  private buildKey(userId: string) {
    return `${userId}-${randomUUID()}.webp`;
  }
}
