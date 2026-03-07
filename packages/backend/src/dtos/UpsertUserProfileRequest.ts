import z from 'zod';

import { UserSchema } from '../schemas/UserSchema.js';

export const UpsertUserProfileRequest = UserSchema.pick({
  bodyFatPercentage: true,
  heightInCentimeters: true,
  weightInGrams: true,
}).extend({
  birthdate: z.coerce.date().meta({
    description:
      'Data de nascimento do usuário no formato YYYY-MM-DD. Ex.: 1998-02-25',
  }),
});

export type UpsertUserProfileRequest = z.infer<typeof UpsertUserProfileRequest>;
