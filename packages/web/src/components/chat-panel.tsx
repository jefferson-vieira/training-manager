'use client';

import type { KeyboardEvent, ReactNode, SubmitEvent } from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ArrowUp, Sparkles, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { env } from '@/config/env';
import { cn } from '@/lib/utils';

interface Props {
  action?: ReactNode;
  greetings: string[];
  onResponseComplete?: () => void;
  suggestions: string[];
  title: ReactNode;
}

export function ChatPanel({
  action,
  greetings,
  onResponseComplete,
  suggestions,
  title,
}: Props) {
  const router = useRouter();

  const { error, messages, regenerate, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `${env.NEXT_PUBLIC_API_URL}/api/ai`,
      credentials: 'include',
      fetch: async (input, init) => {
        const response = await fetch(input, init);

        if (response.status === 401) {
          router.push('/login');
        }

        return response;
      },
    }),
  });

  const [input, setInput] = useState('');

  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      onResponseComplete?.();
    }
  }, [status, messages.length, onResponseComplete]);

  const isBusy = status === 'submitted' || status === 'streaming';

  const lastMessage = messages.at(-1);

  const lastPart = lastMessage?.parts.at(-1);

  const isProcessing =
    status === 'submitted' ||
    (status === 'streaming' && lastPart != null && lastPart.type !== 'text');

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = input.trim();

    if (!text || isBusy) return;

    sendMessage({ text });
    setInput('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    event.currentTarget.form?.requestSubmit();
  };

  const handleSuggestion = (suggestion: string) => {
    if (isBusy) return;

    sendMessage({ text: suggestion });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border p-5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-full bg-primary/10 p-3">
            <Sparkles className="size-4.5 text-primary" />
          </span>

          <div className="flex flex-col gap-1.5">
            {title}

            <span className="flex items-center gap-1 text-xs text-primary">
              <span className="size-2 rounded-full bg-success" />
              <span>Online</span>
            </span>
          </div>
        </div>

        {action}
      </header>

      <Conversation>
        <ConversationContent>
          {greetings.map((greeting) => (
            <Message key={greeting} from="assistant">
              <MessageContent className="max-w-prose">
                {greeting}
              </MessageContent>
            </Message>
          ))}

          {messages.map((message, index) => {
            const isFailed =
              error != null &&
              message.role === 'user' &&
              index === messages.length - 1;

            return (
              <Message key={message.id} from={message.role}>
                <MessageContent
                  className={cn('max-w-prose', isFailed && 'opacity-60')}
                >
                  {message.parts.map((part, partIndex) =>
                    part.type === 'text' ? (
                      <MessageResponse
                        key={`${message.id}-${partIndex}`}
                        animated
                        isAnimating={
                          status === 'streaming' && message.role === 'assistant'
                        }
                      >
                        {part.text}
                      </MessageResponse>
                    ) : null,
                  )}
                </MessageContent>

                {isFailed && (
                  <p className="ml-auto flex items-center gap-2 text-xs text-destructive">
                    Não foi possível enviar.
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerate()}
                    >
                      Tentar novamente
                    </Button>
                  </p>
                )}
              </Message>
            );
          })}

          {isProcessing && (
            <Message from="assistant">
              <MessageContent className="flex-row items-center gap-2">
                <Spinner />
                Processando…
              </MessageContent>
            </Message>
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      {messages.length === 0 && (
        <Suggestions className="ml-auto px-5 py-3">
          {suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion}
              size="xl"
              suggestion={suggestion}
              onClick={handleSuggestion}
            />
          ))}
        </Suggestions>
      )}

      <form
        className="flex items-center gap-2 border-t border-border p-5"
        onSubmit={handleSubmit}
      >
        <Textarea
          className="min-h-11 flex-1 resize-none border-0 bg-muted px-4 py-3 text-sm shadow-none md:text-sm"
          placeholder="Digite sua mensagem"
          rows={1}
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />

        {isBusy ? (
          <Button
            aria-label="Parar"
            className="rounded-full"
            size="icon-xl"
            type="button"
            onClick={stop}
          >
            <Square className="size-5" />
          </Button>
        ) : (
          <Button
            aria-label="Enviar mensagem"
            className="rounded-full"
            disabled={!input.trim()}
            size="icon-xl"
            type="submit"
          >
            <ArrowUp className="size-5" />
          </Button>
        )}
      </form>
    </div>
  );
}
