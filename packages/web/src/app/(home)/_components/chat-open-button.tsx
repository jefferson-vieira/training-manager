'use client';

import { Sparkles } from 'lucide-react';
import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs';

export function ChatOpenButton() {
  const [, setChatParams] = useQueryStates({
    chat_initial_message: parseAsString,
    chat_open: parseAsBoolean.withDefault(false),
  });

  return (
    <button
      className="rounded-full bg-primary p-4"
      onClick={() => setChatParams({ chat_open: true })}
    >
      <Sparkles className="size-6 text-primary-foreground" />
    </button>
  );
}
