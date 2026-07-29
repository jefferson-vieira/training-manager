import type { ReactNode } from 'react';

import { AuthBanner } from './_components/auth-banner';
import { AuthFooter } from './_components/auth-footer';

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: Readonly<AuthLayoutProps>) {
  return (
    <main className="flex min-h-dvh flex-col bg-black lg:flex-row">
      <AuthBanner />

      <div className="flex flex-none flex-col gap-4 rounded-t-2xl bg-background px-5 pt-6 pb-5 lg:flex-1 lg:rounded-none lg:px-16 lg:py-12">
        <div className="flex w-full flex-col items-center gap-4 lg:flex-1 lg:justify-center">
          <h2 className="text-center font-heading text-lg leading-tight font-semibold text-balance text-foreground lg:hidden">
            O app que vai transformar a forma como você treina.
          </h2>

          <div className="w-full max-w-95">{children}</div>
        </div>

        <AuthFooter />
      </div>
    </main>
  );
}
