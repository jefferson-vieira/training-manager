import type { authClient } from '@/lib/auth';

type AuthError = {
  code?: ErrorCodes | (string & {});
  status?: number;
};

type ErrorCodes = keyof typeof authClient.$ERROR_CODES;

const TOO_MANY_REQUESTS = 429;

const FALLBACK = 'Não foi possível continuar. Tente de novo em instantes.';

// Every sign-in failure collapses into one message on purpose: telling
// "unknown e-mail" apart from "wrong password" would let anyone enumerate
// which e-mails have accounts.
const MESSAGE_BY_CODE = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Esse e-mail já está em uso. Tente entrar.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'Esse e-mail já está em uso. Tente entrar.',
  USER_NOT_FOUND: 'E-mail ou senha incorretos.',
} satisfies Partial<Record<ErrorCodes, string>>;

export function getAuthErrorMessage(error?: AuthError | null) {
  if (!error) {
    return FALLBACK;
  }

  if (!error.status) {
    return 'Não foi possível conectar. Verifique sua internet e tente de novo.';
  }

  if (error.status === TOO_MANY_REQUESTS) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }

  if (error.code && error.code in MESSAGE_BY_CODE) {
    return MESSAGE_BY_CODE[error.code as keyof typeof MESSAGE_BY_CODE];
  }

  return FALLBACK;
}
