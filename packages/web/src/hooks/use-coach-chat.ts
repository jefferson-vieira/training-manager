'use client';

import { useChat } from '@ai-sdk/react';

import { useCoach } from '@/contexts/coach-context';

export function useCoachChat() {
  const { chat, drawerHandle } = useCoach();

  return {
    ...useChat({ chat }),
    drawerHandle,
  };
}
