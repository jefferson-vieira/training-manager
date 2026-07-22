import type { UIMessage } from 'ai';

import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { env } from '@/config/env';

type CreateCoachChatParams = {
  onUnauthorized: () => void;
};

export function createCoachChat({ onUnauthorized }: CreateCoachChatParams) {
  return new Chat<UIMessage>({
    transport: new DefaultChatTransport({
      api: `${env.NEXT_PUBLIC_API_URL}/api/ai`,
      credentials: 'include',
      fetch: async (input, init) => {
        const response = await fetch(input, init);

        if (response.status === 401) {
          onUnauthorized();
        }

        return response;
      },
    }),
  });
}
