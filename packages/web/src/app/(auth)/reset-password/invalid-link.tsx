import { Link2Off } from 'lucide-react';
import NextLink from 'next/link';

import { Button } from '@/components/ui/button';
import { FieldDescription } from '@/components/ui/field';
import { Link } from '@/components/ui/link';

import { AuthHeading } from '../_components/auth-heading';

export function InvalidLink() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/12 lg:size-16">
        <Link2Off className="size-6.5 text-destructive lg:size-7.5" />
      </div>

      <AuthHeading
        description="Este link expirou ou já foi utilizado. Solicite um novo para redefinir sua senha."
        title="Link não é mais válido"
        variant="center"
      />

      <Button
        className="w-full"
        nativeButton={false}
        render={<NextLink href="/forgot-password" />}
        size="xl"
      >
        Solicitar novo link
      </Button>

      <FieldDescription>
        Lembrou a senha? <Link href="/login">Voltar ao login</Link>
      </FieldDescription>
    </div>
  );
}
