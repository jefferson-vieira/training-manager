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
      },
      where: {
        id: dto.userId,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}
