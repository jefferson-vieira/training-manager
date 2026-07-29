'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getAuthErrorMessage } from '@/helpers/auth-error-message';
import { authClient } from '@/lib/auth';

import type { SignUpFormValues } from './schema';

import { signUpFormSchema } from './schema';

export function useSignUpForm() {
  const router = useRouter();

  const form = useForm<SignUpFormValues>({
    defaultValues: {
      email: '',
      name: '',
      password: '',
    },
    mode: 'onSubmit',
    resolver: zodResolver(signUpFormSchema),
    reValidateMode: 'onChange',
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const { error } = await authClient.signUp.email(values);

    if (error) {
      toast.error(getAuthErrorMessage(error));

      return;
    }

    router.replace('/onboarding');
    router.refresh();
  });

  return { form, handleSubmit };
}
