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
import { Link } from '@/components/ui/link';
import { PasswordInput } from '@/components/ui/password-input';

import { AuthHeading } from '../_components/auth-heading';
import { MIN_PASSWORD_LENGTH } from './schemas';
import { useResetPasswordForm } from './use-reset-password-form';

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: Readonly<ResetPasswordFormProps>) {
  const { form, handleSubmit } = useResetPasswordForm(token);

  return (
    <div className="flex flex-col gap-8">
      <AuthHeading
        description="Crie uma nova senha para sua conta."
        title="Nova senha"
      />

      <form noValidate onSubmit={handleSubmit}>
        <FieldGroup className="gap-4">
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-password">Nova senha</FieldLabel>

                <PasswordInput
                  {...field}
                  aria-describedby={
                    fieldState.invalid
                      ? 'reset-password-error'
                      : 'reset-password-hint'
                  }
                  aria-invalid={fieldState.invalid}
                  autoComplete="new-password"
                  id="reset-password"
                  placeholder="••••••••"
                />

                {fieldState.invalid ? (
                  <FieldError
                    errors={[fieldState.error]}
                    id="reset-password-error"
                  />
                ) : (
                  <FieldDescription id="reset-password-hint">
                    Mínimo de {MIN_PASSWORD_LENGTH} caracteres.
                  </FieldDescription>
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-confirm-password">
                  Confirmar senha
                </FieldLabel>

                <PasswordInput
                  {...field}
                  aria-describedby={
                    fieldState.invalid
                      ? 'reset-confirm-password-error'
                      : undefined
                  }
                  aria-invalid={fieldState.invalid}
                  autoComplete="new-password"
                  id="reset-confirm-password"
                  placeholder="••••••••"
                />

                {fieldState.invalid && (
                  <FieldError
                    errors={[fieldState.error]}
                    id="reset-confirm-password-error"
                  />
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
            Salvar nova senha
          </Button>
        </FieldGroup>
      </form>

      <FieldDescription className="text-center">
        Lembrou a senha? <Link href="/login">Voltar ao login</Link>
      </FieldDescription>
    </div>
  );
}
