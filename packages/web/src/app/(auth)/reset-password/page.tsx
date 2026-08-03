import { InvalidLink } from './invalid-link';
import { ResetPasswordForm } from './reset-password-form';

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<ResetPasswordPageProps>) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidLink />;
  }

  return <ResetPasswordForm token={token} />;
}
