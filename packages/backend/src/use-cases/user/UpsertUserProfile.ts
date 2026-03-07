import type { UpsertUserProfileRequest } from '../../dtos/UpsertUserProfileRequest.js';

import { prisma } from '../../lib/db.js';

interface InputDto extends UpsertUserProfileRequest {
  userId: string;
}

export class UpsertUserProfile {
  async execute(dto: InputDto) {
    const userProfile = await prisma.userProfile.upsert({
      create: dto,
      omit: {
        id: true,
        userId: true,
      },
      update: dto,
      where: {
        userId: dto.userId,
      },
    });

    return userProfile;
  }
}
