'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/lib/auth';

export function LogoutButton() {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  const [error, setError] = useState<null | string>(null);

  const handleLogout = async () => {
    setError(null);
    setIsPending(true);

    await authClient.signOut({
      fetchOptions: {
        onError: () => {
          setError('Não foi possível sair. Tente novamente.');
          setIsPending(false);
        },
        onSuccess: () => {
          router.push('/login');
        },
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className="flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-base font-semibold text-[#ff3838] transition-opacity hover:opacity-80 disabled:opacity-50"
        disabled={isPending}
        type="button"
        onClick={handleLogout}
      >
        Sair da conta
        <LogOut className="size-4" />
      </button>

      {error && (
        <p className="text-center text-sm text-[#ff3838]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
