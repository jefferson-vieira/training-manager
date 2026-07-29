'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getAuthErrorMessage } from '@/helpers/auth-error-message';
import { authClient } from '@/lib/auth';

import type { SignInFormValues } from './schemas';

import { signInFormSchema } from './schemas';

export function useSignInForm() {
  const router = useRouter();

  const form = useForm<SignInFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onSubmit',
    resolver: zodResolver(signInFormSchema),
    reValidateMode: 'onChange',
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const { error } = await authClient.signIn.email(values);

    if (error) {
      toast.error(getAuthErrorMessage(error));

      return;
    }

    router.replace('/');
    router.refresh();
  });

  return { form, handleSubmit };
}
