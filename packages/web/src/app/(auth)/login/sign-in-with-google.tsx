'use client';

import Image from 'next/image';

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
      className="h-9.5 rounded-full bg-white px-6 text-black hover:bg-white/90"
      onClick={handleGoogleLogin}
    >
      <Image
        alt=""
        className="shrink-0"
        height={16}
        src="/google-icon.svg"
        width={16}
      />
      Fazer login com Google
    </Button>
  );
};
