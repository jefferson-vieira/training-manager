import { FieldDescription, FieldSeparator } from '@/components/ui/field';
import { Link } from '@/components/ui/link';

import { AuthHeading } from '../_components/auth-heading';
import { GoogleAuthButton } from '../_components/google-auth-button';
import { SignInForm } from './sign-in-form';

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <AuthHeading
        description="Faça login para acessar seu treino."
        title="Bem-vindo"
      />

      <div className="flex flex-col gap-6">
        <SignInForm />

        <FieldSeparator>ou</FieldSeparator>

        <GoogleAuthButton />
      </div>

      <FieldDescription className="text-center">
        Não tem uma conta? <Link href="/signup">Criar conta</Link>
      </FieldDescription>
    </div>
  );
}
