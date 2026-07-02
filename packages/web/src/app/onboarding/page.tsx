'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { ChatHeader } from '@/components/ui/chat-header';
import { Separator } from '@/components/ui/separator';
import { env } from '@/config/env';

export default function OnboardingPage() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${env.NEXT_PUBLIC_API_URL}/api/ai`,
      credentials: 'include',
    }),
  });

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim()) {
      sendMessage({ text: message.text });
      setInput('');
    }
  };

  return (
    <main className="flex h-screen flex-col">
      <ChatHeader className="p-5" name="Coach IA" />

      <Separator />

      <Conversation>
        <ConversationContent>
          <Message from="system">
            <MessageContent>Bem-vindo ao FIT.AI! 🎉</MessageContent>
          </Message>

          <Message from="system">
            <MessageContent>
              O app que vai transformar a forma como você treina. Aqui você
              monta seu plano de treino personalizado, acompanha sua evolução
              com estatísticas detalhadas e conta com uma IA disponível 24h para
              te guiar em cada exercício.
            </MessageContent>
          </Message>

          <Message from="system">
            <MessageContent>
              Tudo pensado para você alcançar seus objetivos de forma
              inteligente e consistente.
            </MessageContent>
          </Message>

          <Message from="system">
            <MessageContent>Vamos configurar seu perfil?</MessageContent>
          </Message>

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <MessageResponse key={`${message.id}-${i}`}>
                          {part.text}
                        </MessageResponse>
                      );
                    default:
                      return null;
                  }
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
      </Conversation>

      {!messages.length && (
        <Suggestions className="ml-auto p-5">
          <Suggestion suggestion="Vamos lá!" onClick={handleSuggestionClick} />
        </Suggestions>
      )}

      <Separator />

      <PromptInput className="p-5" onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            placeholder="Digite sua mensagem"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
          />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputSubmit
            disabled={!input.trim()}
            status={status === 'streaming' ? 'streaming' : 'ready'}
          />
        </PromptInputFooter>
      </PromptInput>
    </main>
  );
}
