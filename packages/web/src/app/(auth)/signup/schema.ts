import * as z from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

export const signUpFormSchema = z.object({
  email: z.email('Informe um e-mail válido.').trim(),
  name: z.string().trim().min(1, 'Informe seu nome.'),
  password: z
    .string()
    .trim()
    .min(
      MIN_PASSWORD_LENGTH,
      `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    ),
});

export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
