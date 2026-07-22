'use client';

import type { Chat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useMemo, useState } from 'react';

import type { DrawerHandle } from '@/components/ui/drawer';

import { createDrawerHandle } from '@/components/ui/drawer';
import { createCoachChat } from '@/lib/chat';

type CoachContextValue = {
  chat: Chat<UIMessage>;
  drawerHandle: DrawerHandle;
};

const CoachContext = createContext<CoachContextValue | null>(null);

type CoachProviderProps = {
  children: ReactNode;
};

export function CoachProvider({ children }: Readonly<CoachProviderProps>) {
  const router = useRouter();

  const [chat] = useState(() =>
    createCoachChat({
      onUnauthorized: () => router.push('/login'),
    }),
  );

  const [drawerHandle] = useState(() => createDrawerHandle());

  const value = useMemo<CoachContextValue>(
    () => ({ chat, drawerHandle }),
    [chat, drawerHandle],
  );

  return (
    <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
  );
}

export function useCoach() {
  const context = useContext(CoachContext);

  if (!context) {
    throw new Error('useCoach must be used within a CoachProvider.');
  }

  return context;
}
