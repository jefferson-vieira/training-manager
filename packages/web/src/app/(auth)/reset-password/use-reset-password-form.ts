'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getAuthErrorMessage } from '@/helpers/auth-error-message';
import { authClient } from '@/lib/auth';

import type { ResetPasswordFormValues } from './schemas';

import { resetPasswordFormSchema } from './schemas';

export function useResetPasswordForm(token: string) {
  const router = useRouter();

  const form = useForm<ResetPasswordFormValues>({
    defaultValues: {
      confirmPassword: '',
      password: '',
    },
    mode: 'onSubmit',
    resolver: zodResolver(resetPasswordFormSchema),
    reValidateMode: 'onChange',
  });

  const handleSubmit = form.handleSubmit(async ({ password }) => {
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (error) {
        toast.error(getAuthErrorMessage(error));

        return;
      }

      await authClient.signOut();

      toast.success('Senha alterada. Entre com a nova senha.');

      router.replace('/login');
    } catch {
      toast.error(getAuthErrorMessage());
    }
  });

  return { form, handleSubmit };
}
