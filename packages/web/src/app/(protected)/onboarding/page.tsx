'use client';

import { ChatPanel } from '@/components/chat-panel';

import { SignOutButton } from './_components/sign-out-button';

const GREETINGS = [
  'Bem-vindo ao FIT.AI! 🎉',
  'O app que vai transformar a forma como você treina. Aqui você monta seu plano de treino personalizado, acompanha sua evolução com estatísticas detalhadas e conta com uma IA disponível 24h para te guiar em cada exercício.',
  'Tudo pensado para você alcançar seus objetivos de forma inteligente e consistente.',
  'Vamos configurar seu perfil?',
];

const SUGGESTIONS = ['Vamos lá!'];

export default function OnboardingPage() {
  return (
    <main className="flex h-dvh flex-col">
      <ChatPanel
        action={<SignOutButton />}
        greetings={GREETINGS}
        suggestions={SUGGESTIONS}
        title={
          <h1 className="text-base font-semibold text-foreground">Coach AI</h1>
        }
      />
    </main>
  );
}
