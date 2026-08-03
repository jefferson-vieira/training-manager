import { FieldDescription, FieldSeparator } from '@/components/ui/field';
import { Link } from '@/components/ui/link';

import { AuthHeading } from '../_components/auth-heading';
import { GoogleAuthButton } from '../_components/google-auth-button';
import { SignUpForm } from './sign-up-form';

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-7">
      <AuthHeading
        description="Junte-se a nós e transforme seus resultados."
        title="Criar conta"
      />

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
