'use client';

import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/link';
import { PasswordInput } from '@/components/ui/password-input';

import { useSignInForm } from './use-sign-in-form';

export function SignInForm() {
  const { form, handleSubmit } = useSignInForm();

  return (
    <form noValidate onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="signin-email">E-mail</FieldLabel>

              <Input
                {...field}
                aria-describedby={
                  fieldState.invalid ? 'signin-email-error' : undefined
                }
                aria-invalid={fieldState.invalid}
                autoComplete="email"
                id="signin-email"
                placeholder="voce@email.com"
                type="email"
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                  id="signin-email-error"
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
              <FieldLabel htmlFor="signin-password">Senha</FieldLabel>

              <PasswordInput
                {...field}
                aria-describedby={
                  fieldState.invalid ? 'signin-password-error' : undefined
                }
                aria-invalid={fieldState.invalid}
                autoComplete="current-password"
                id="signin-password"
                placeholder="••••••••"
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                  id="signin-password-error"
                />
              )}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                checked={field.value}
                className="after:-inset-3.5"
                id="signin-remember"
                name={field.name}
                onCheckedChange={field.onChange}
              />

              <FieldLabel className="font-normal" htmlFor="signin-remember">
                Manter conectado
              </FieldLabel>

              <Link className="text-xs" href="/forgot-password">
                Esqueci minha senha
              </Link>
            </Field>
          )}
        />

        <Button
          className="w-full"
          loading={form.formState.isSubmitting}
          size="xl"
          type="submit"
        >
          Entrar
        </Button>
      </FieldGroup>
    </form>
  );
}
