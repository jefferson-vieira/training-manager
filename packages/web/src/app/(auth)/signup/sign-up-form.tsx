'use client';

import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

import { MIN_PASSWORD_LENGTH } from './schema';
import { useSignUpForm } from './use-sign-up-form';

export function SignUpForm() {
  const { form, handleSubmit } = useSignUpForm();

  return (
    <form noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-name">Nome</FieldLabel>

              <Input
                {...field}
                aria-describedby={
                  fieldState.invalid ? 'signup-name-error' : undefined
                }
                aria-invalid={fieldState.invalid}
                autoComplete="name"
                id="signup-name"
                placeholder="Como podemos te chamar"
                type="text"
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                  id="signup-name-error"
                />
              )}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-email">E-mail</FieldLabel>

              <Input
                {...field}
                aria-describedby={
                  fieldState.invalid ? 'signup-email-error' : undefined
                }
                aria-invalid={fieldState.invalid}
                autoComplete="email"
                id="signup-email"
                placeholder="voce@email.com"
                type="email"
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                  id="signup-email-error"
                />
              )}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signup-password">Senha</FieldLabel>

              <PasswordInput
                {...field}
                aria-describedby={
                  fieldState.invalid
                    ? 'signup-password-error'
                    : 'signup-password-hint'
                }
                aria-invalid={fieldState.invalid}
                autoComplete="new-password"
                id="signup-password"
                placeholder="••••••••"
              />

              {fieldState.invalid ? (
                <FieldError
                  errors={[fieldState.error]}
                  id="signup-password-error"
                />
              ) : (
                <FieldDescription className="text-xs" id="signup-password-hint">
                  Mínimo de {MIN_PASSWORD_LENGTH} caracteres.
                </FieldDescription>
              )}
            </Field>
          )}
        />

        <Button
          className="w-full"
          loading={form.formState.isSubmitting}
          size="xl"
          type="submit"
        >
          Criar conta
        </Button>
      </FieldGroup>
    </form>
  );
}
