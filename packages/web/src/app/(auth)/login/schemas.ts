import * as z from 'zod';

// Sign in deliberately skips the length rule: a short wrong password and a
// wrong password must fail the same way, or the form leaks the password policy
// and gives attackers a second signal.
export const signInFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email('Informe um e-mail válido.')),
  password: z.string().trim().min(1, 'Informe sua senha.'),
  rememberMe: z.boolean(),
});

export type SignInFormValues = z.infer<typeof signInFormSchema>;
