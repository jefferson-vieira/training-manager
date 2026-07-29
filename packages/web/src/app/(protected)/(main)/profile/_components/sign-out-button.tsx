'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSignOut } from '@/hooks/use-sign-out';

export function SignOutButton() {
  const { isPending, signOut } = useSignOut();

  return (
    <Button
      className="rounded-full"
      color="destructive"
      disabled={isPending}
      size="xl"
      type="button"
      variant="ghost"
      onClick={signOut}
    >
      Sair da conta
      <LogOut data-icon="inline-end" />
    </Button>
  );
}
