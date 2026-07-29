import { FieldDescription, FieldSeparator } from '@/components/ui/field';
import { Link } from '@/components/ui/link';

import { GoogleAuthButton } from '../_components/google-auth-button';
import { SignUpForm } from './sign-up-form';

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="hidden flex-col gap-1.5 lg:flex">
        <h1 className="font-heading text-2xl leading-tight font-semibold text-foreground">
          Criar conta
        </h1>

        <p className="text-sm text-muted-foreground">
          Junte-se a nós e transforme seus resultados.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <SignUpForm />

        <FieldSeparator>ou</FieldSeparator>

        <GoogleAuthButton />

        <FieldDescription className="text-center text-xs">
          Ao criar a conta você aceita os{' '}
          <span className="font-medium text-foreground">Termos de uso</span> e a{' '}
          <span className="font-medium text-foreground">
            Política de privacidade
          </span>
          .
        </FieldDescription>
      </div>

      <FieldDescription className="text-center">
        Já tem uma conta? <Link href="/login">Entrar</Link>
      </FieldDescription>
    </div>
  );
}
