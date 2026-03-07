import z from 'zod';

export const UserSchema = z.object({
  age: z.number().positive(),
  bodyFatPercentage: z.number().min(0).max(100),
  heightInCentimeters: z.number().min(1),
  id: z.uuid(),
  image: z.string().nullable(),
  name: z.string(),
  weightInGrams: z.number().min(1),
});
