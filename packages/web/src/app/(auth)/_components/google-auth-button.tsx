'use client';

import Image from 'next/image';
import { toast } from 'sonner';

import googleIcon from '@/assets/icons/google.svg';
import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { getAuthErrorMessage } from '@/helpers/auth-error-message';
import { authClient } from '@/lib/auth';

export const GoogleAuthButton = () => {
  const handleGoogleAuth = async () => {
    const { error } = await authClient.signIn.social({
      callbackURL: `${env.NEXT_PUBLIC_BASE_URL}/`,
      provider: 'google',
    });

    if (error) {
      toast.error(getAuthErrorMessage(error));
    }
  };

  return (
    <Button
      className="w-full"
      size="xl"
      type="button"
      variant="outline"
      onClick={handleGoogleAuth}
    >
      <Image
        alt="Google logo"
        data-icon="inline-start"
        height={20}
        src={googleIcon}
        width={20}
      />
      Continuar com o Google
    </Button>
  );
};
