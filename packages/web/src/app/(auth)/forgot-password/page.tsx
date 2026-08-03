'use client';

import { AnimatePresence, motion, type Transition } from 'motion/react';
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
import { Link } from '@/components/ui/link';

import { AuthHeading } from '../_components/auth-heading';
import { CheckYourEmail } from './check-your-email';
import { useForgotPasswordForm } from './use-forgot-password-form';

const transition: Transition = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1],
};

export default function ForgotPasswordPage() {
  const { backToForm, form, handleSubmit, sent } = useForgotPasswordForm();

  return (
    <main aria-live="polite" className="grid">
      <AnimatePresence initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            className="col-start-1 row-start-1"
            exit={{ opacity: 0, transform: 'translateY(20px)' }}
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            transition={transition}
          >
            <CheckYourEmail onTryAnotherEmailClick={backToForm} />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            className="col-start-1 row-start-1 flex flex-col gap-8"
            exit={{ opacity: 0, transform: 'translateY(-20px)' }}
            initial={{ opacity: 0, transform: 'translateY(-20px)' }}
            transition={transition}
          >
            <AuthHeading
              description="Informe seu e-mail para receber o link de redefinição."
              title="Recuperar senha"
            />

            <form noValidate onSubmit={handleSubmit}>
              <FieldGroup className="gap-4">
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="forgot-email">E-mail</FieldLabel>

                      <Input
                        {...field}
                        aria-describedby={
                          fieldState.invalid ? 'forgot-email-error' : undefined
                        }
                        aria-invalid={fieldState.invalid}
                        autoComplete="email"
                        id="forgot-email"
                        placeholder="voce@email.com"
                        type="email"
                      />

                      {fieldState.invalid && (
                        <FieldError
                          errors={[fieldState.error]}
                          id="forgot-email-error"
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
                  Enviar link
                </Button>
              </FieldGroup>
            </form>

            <FieldDescription className="text-center">
              Lembrou a senha? <Link href="/login">Voltar ao login</Link>
            </FieldDescription>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
