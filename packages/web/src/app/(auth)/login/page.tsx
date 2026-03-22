import { Heart } from 'lucide-react';
import Image from 'next/image';

import logo from '@/assets/imgs/logo.svg';

import { SignInWithGoogle } from './sign-in-with-google';

export default async function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[url(/teste5.png)] bg-cover bg-center">
      <div className="relative flex justify-center p-12">
        <Image alt="FIT.AI" src={logo} />
      </div>

      <div className="mt-auto flex flex-col items-center gap-15 rounded-t-2xl bg-primary px-4 pt-12 pb-10">
        <div className="flex flex-col items-center gap-6">
          <h1 className="font-heading text-center text-[2rem] leading-[1.05] font-semibold text-primary-foreground">
            O app que vai transformar a forma como você treina.
          </h1>

          <SignInWithGoogle />
        </div>

        <p className="font-heading inline-flex items-center gap-1 text-xs text-primary-foreground">
          Feito com <Heart fill="var(--color-red-600)" strokeWidth={0} /> por{' '}
          <a
            aria-label="Entrar em contato via LinkedIn"
            href="www.linkedin.com/in/jefferson-vieira-da-silva"
            rel="noopener noreferrer"
            target="_blank"
            title="Fale comigo no LinkedIn"
          >
            Jefferson Vieira da Silva
          </a>
        </p>
      </div>
    </main>
  );
}
