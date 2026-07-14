import type { ReactNode } from 'react';

import { BottomNav } from './_components/bottom-nav';

type HomeLayoutProps = {
  children: ReactNode;
};

export default function HomeLayout({ children }: HomeLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background pb-28">
      {children}

      <BottomNav />
    </div>
  );
}
