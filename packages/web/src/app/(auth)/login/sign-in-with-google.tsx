'use client';

import Image from 'next/image';

import googleIcon from '@/assets/icons/google.svg';
import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { authClient } from '@/lib/auth';

export const SignInWithGoogle = () => {
  const handleGoogleLogin = () => {
    authClient.signIn.social({
      callbackURL: `${env.NEXT_PUBLIC_BASE_URL}/`,
      provider: 'google',
    });
  };

  return (
    <Button
      className="rounded-full bg-white text-black hover:bg-white/80"
      data-icon="inline-start"
      onClick={handleGoogleLogin}
    >
      <Image alt="Google logo" height={20} src={googleIcon} width={20} />
      Fazer login com o Google
    </Button>
  );
};
