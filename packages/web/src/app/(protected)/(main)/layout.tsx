import type { ReactNode } from 'react';

import { BottomNav } from './_components/bottom-nav';

type HomeLayoutProps = {
  children: ReactNode;
};

export default function HomeLayout({ children }: Readonly<HomeLayoutProps>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {children}

      <BottomNav />
    </div>
  );
}
