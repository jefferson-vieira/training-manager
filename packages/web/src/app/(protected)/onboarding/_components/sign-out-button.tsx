'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSignOut } from '@/hooks/use-sign-out';

export function SignOutButton() {
  const { isPending, signOut } = useSignOut();

  return (
    <Button
      aria-label="Sair"
      className="rounded-full"
      disabled={isPending}
      size="icon-xl"
      type="button"
      variant="ghost"
      onClick={signOut}
    >
      <LogOut />
    </Button>
  );
}
