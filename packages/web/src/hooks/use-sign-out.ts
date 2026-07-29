'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { getAuthErrorMessage } from '@/helpers/auth-error-message';
import { authClient } from '@/lib/auth';

export function useSignOut() {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  const signOut = async () => {
    setIsPending(true);

    try {
      const { error } = await authClient.signOut();

      if (error) {
        toast.error(getAuthErrorMessage(error));

        return;
      }
    } catch {
      toast.error(getAuthErrorMessage());

      return;
    } finally {
      setIsPending(false);
    }

    router.replace('/login');
    router.refresh();
  };

  return { isPending, signOut };
}
