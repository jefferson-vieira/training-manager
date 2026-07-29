import dayjs from 'dayjs';

import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';

interface InputDto {
  userId: string;
}

export class GetUserProfile {
  async execute(dto: InputDto) {
    const userProfile = await prisma.userProfile.findUnique({
      omit: {
        id: true,
        userId: true,
      },
      where: {
        userId: dto.userId,
      },
    });

    if (!userProfile) {
      throw new NotFoundError('User profile not found');
    }

    return {
      ...userProfile,
      age: this.calcAge(userProfile.birthdate),
      birthdate: dayjs(userProfile.birthdate).format('YYYY-MM-DD'),
    };
  }

  private calcAge(birthdate: Date) {
    return dayjs().diff(dayjs(birthdate), 'year');
  }
}
