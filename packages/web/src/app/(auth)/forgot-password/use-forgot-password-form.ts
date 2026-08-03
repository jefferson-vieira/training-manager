'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { env } from '@/config/env';
import { getAuthErrorMessage } from '@/helpers/auth-error-message';
import { authClient } from '@/lib/auth';

import type { ForgotPasswordFormValues } from './schemas';

import { forgotPasswordFormSchema } from './schemas';

export function useForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: '',
    },
    mode: 'onSubmit',
    resolver: zodResolver(forgotPasswordFormSchema),
    reValidateMode: 'onChange',
  });

  const handleSubmit = form.handleSubmit(async ({ email }) => {
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${env.NEXT_PUBLIC_BASE_URL}/reset-password`,
      });

      if (error) {
        toast.error(getAuthErrorMessage(error));

        return;
      }

      setSent(true);
    } catch {
      toast.error(getAuthErrorMessage());
    }
  });

  const backToForm = () => {
    setSent(false);
  };

  return {
    backToForm,
    form,
    handleSubmit,
    sent,
  };
}
