import { LinkButton } from 'web';
import { ArrowRight, ExternalLink } from 'lucide-react';

export function Default() {
  return <LinkButton href="/plano">Ver plano completo</LinkButton>;
}

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href="/treino">Link</LinkButton>
      <LinkButton href="/treino" variant="default">
        Primário
      </LinkButton>
      <LinkButton href="/treino" variant="secondary">
        Secundário
      </LinkButton>
      <LinkButton href="/treino" variant="outline">
        Contorno
      </LinkButton>
      <LinkButton href="/treino" variant="ghost">
        Fantasma
      </LinkButton>
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href="/treino" variant="default">
        Continuar
        <ArrowRight data-icon="inline-end" />
      </LinkButton>
      <LinkButton href="https://example.com" target="_blank">
        Abrir documentação
        <ExternalLink data-icon="inline-end" />
      </LinkButton>
    </div>
  );
}
