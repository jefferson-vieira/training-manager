import dayjs from 'dayjs';

import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';

interface InputDto {
  userId: string;
}

export class GetUser {
  async execute(dto: InputDto) {
    const user = await prisma.user.findUnique({
      select: {
        id: true,
        image: true,
        name: true,
        profile: {
          omit: {
            id: true,
            userId: true,
          },
        },
      },
      where: {
        id: dto.userId,
      },
    });

    if (!user || !user.profile) {
      throw new NotFoundError('User not found');
    }

    return {
      ...user,
      ...user.profile,
      age: this.calcAge(user.profile.birthdate),
    };
  }

  private calcAge(birthdate: Date) {
    return dayjs().diff(dayjs(birthdate), 'year');
  }
}
