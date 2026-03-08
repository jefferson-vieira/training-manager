import Image from 'next/image';

import { SignInWithGoogle } from './sign-in-with-google';

export default async function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col bg-black">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <Image
          alt=""
          className="object-cover"
          fill
          priority
          src="/login-bg.png"
        />
      </div>

      <div className="relative z-10 flex justify-center pt-12">
        <Image alt="FIT.AI" height={38} src="/fit-ai-logo.svg" width={85} />
      </div>

      <div className="flex-1" />

      <div className="relative z-10 flex flex-col items-center gap-15 rounded-t-[20px] bg-primary px-5 pt-12 pb-10">
        <div className="flex w-full flex-col items-center gap-6">
          <h1 className="font-heading w-full text-center text-[32px] leading-[1.05] font-semibold text-primary-foreground">
            O app que vai transformar a forma como você treina.
          </h1>

          <SignInWithGoogle />
        </div>

        <p className="font-heading text-xs leading-[1.4] text-primary-foreground/70">
          ©2026 Copyright FIT.AI. Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
