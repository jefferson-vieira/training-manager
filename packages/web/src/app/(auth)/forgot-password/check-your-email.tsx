import { MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FieldDescription } from '@/components/ui/field';

import { Link } from '../../../components/ui/link';

type CheckYourEmailProps = {
  onTryAnotherEmailClick: () => void;
};

export function CheckYourEmail({
  onTryAnotherEmailClick,
}: Readonly<CheckYourEmailProps>) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/12 lg:size-16">
        <MailCheck className="size-6.5 text-primary lg:size-7.5" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-lg leading-tight font-semibold text-foreground lg:text-2xl">
          Verifique seu e-mail
        </h1>

        <p className="max-w-80 text-sm leading-normal text-muted-foreground">
          Enviamos um link de redefinição de senha para o seu e-mail.
        </p>
      </div>

      <Link className="w-full" href="/login" size="xl" variant="outline">
        Voltar ao login
      </Link>

      <FieldDescription className="text-center">
        Não recebeu? Verifique o spam ou{' '}
        <Button size="inherit" variant="link" onClick={onTryAnotherEmailClick}>
          tente outro e-mail
        </Button>
        .
      </FieldDescription>
    </div>
  );
}
