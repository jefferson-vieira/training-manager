import type { ReactNode } from 'react';

import { CoachProvider } from '@/contexts/coach-context';

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({
  children,
}: Readonly<ProtectedLayoutProps>) {
  return <CoachProvider>{children}</CoachProvider>;
}
