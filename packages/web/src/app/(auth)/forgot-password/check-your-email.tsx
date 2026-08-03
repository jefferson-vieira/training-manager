import { MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FieldDescription } from '@/components/ui/field';

import { Link } from '../../../components/ui/link';
import { AuthHeading } from '../_components/auth-heading';

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

      <AuthHeading
        description="Enviamos um link de redefinição de senha para o seu e-mail."
        title="Verifique seu e-mail"
        variant="center"
      />

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
