import * as z from 'zod';

export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email('Informe um e-mail válido.')),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
