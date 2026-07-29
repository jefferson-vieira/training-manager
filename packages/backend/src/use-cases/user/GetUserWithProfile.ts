import { GetUser } from './GetUser.js';
import { GetUserProfile } from './GetUserProfile.js';

interface InputDto {
  userId: string;
}

export class GetUserWithProfile {
  async execute(dto: InputDto) {
    const getUser = new GetUser();

    const getUserProfile = new GetUserProfile();

    const [user, userProfile] = await Promise.all([
      getUser.execute(dto),
      getUserProfile.execute(dto),
    ]);

    return {
      ...user,
      ...userProfile,
    };
  }
}
