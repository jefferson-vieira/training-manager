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
        <div className="mx-auto flex w-full max-w-95 flex-col lg:flex-1 lg:justify-center">
          {children}
        </div>

        <AuthFooter />
      </div>
    </main>
  );
}
