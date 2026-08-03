import * as z from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

export const resetPasswordFormSchema = z
  .object({
    confirmPassword: z.string().trim().min(1, 'Confirme a nova senha.'),
    password: z
      .string()
      .trim()
      .min(
        MIN_PASSWORD_LENGTH,
        `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      ),
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    error: 'As senhas não são iguais.',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
