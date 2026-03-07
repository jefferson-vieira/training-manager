import z from 'zod';

export const UserSchema = z.object({
  age: z.number().positive().meta({
    description: 'Idade do usuário',
  }),
  bodyFatPercentage: z.number().int().min(0).max(1000).meta({
    description:
      'Percentual de gordura corporal (0 a 1000). Ex.: 40% = 400; 37,5% = 375',
  }),
  heightInCentimeters: z.number().int().min(1).meta({
    description: 'Altura do usuário em centímetros. Ex.: 1.70m = 170',
  }),
  id: z.uuid().meta({
    description: 'ID do usuário',
  }),
  image: z.string().nullable().meta({
    description: 'Link da foto de perfil do usuário',
  }),
  name: z.string().trim().nonempty().meta({
    description: 'None do usuário',
  }),
  weightInGrams: z.number().int().min(1).meta({
    description: 'Peso do usuário em gramas. Ex.: 70kg = 70000',
  }),
});
