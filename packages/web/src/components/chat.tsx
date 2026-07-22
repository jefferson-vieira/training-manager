'use client';

import { Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ChatPanel } from '@/components/chat-panel';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useCoachChat } from '@/hooks/use-coach-chat';

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

  const { drawerHandle, messages, status } = useCoachChat();

  const handleOpenChange = (nextOpen: boolean) => {
    // Refresh server data only when closing an idle conversation that has
    // messages: the coach may have changed data via tools, and refreshing
    // mid-stream would abort the in-flight response.
    if (nextOpen || status !== 'ready' || messages.length === 0) {
      return;
    }

    router.refresh();
  };

  return (
    <Drawer
      handle={drawerHandle}
      showSwipeHandle
      onOpenChange={handleOpenChange}
    >
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
        />
      </DrawerContent>
    </Drawer>
  );
}
