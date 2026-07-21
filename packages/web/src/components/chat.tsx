'use client';

import { Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

import { ChatPanel } from '@/components/chat-panel';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

const GREETINGS = [
  'Olá! Sou sua IA personal. Como posso ajudar com seu treino hoje?',
];

const SUGGESTIONS = [
  'Alterar plano de treino',
  'Mudar objetivo',
  'Atualizar informações',
];

export function Chat() {
  const router = useRouter();

  const hasCompletedResponse = useRef(false);

  const handleResponseComplete = useCallback(() => {
    hasCompletedResponse.current = true;
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen || !hasCompletedResponse.current) return;

    router.refresh();
  };

  return (
    <Drawer showSwipeHandle onOpenChange={handleOpenChange}>
      <DrawerTrigger
        render={
          <Button
            aria-label="Abrir o Coach AI"
            className="rounded-full"
            size="icon-xl"
          >
            <Sparkles className="size-6" />
          </Button>
        }
      />

      <DrawerContent className="h-full">
        <ChatPanel
          action={
            <DrawerClose
              render={
                <Button
                  aria-label="Fechar o Coach AI"
                  className="rounded-full"
                  size="icon-xl"
                  variant="ghost"
                >
                  <X className="size-6" />
                </Button>
              }
            />
          }
          greetings={GREETINGS}
          suggestions={SUGGESTIONS}
          title={
            <DrawerTitle className="text-base font-semibold text-foreground">
              Coach AI
            </DrawerTitle>
          }
          onResponseComplete={handleResponseComplete}
        />
      </DrawerContent>
    </Drawer>
  );
}
