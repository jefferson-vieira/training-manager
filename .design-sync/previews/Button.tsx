import { Button } from 'web';
import { ArrowRight, Play, Plus, Trash2 } from 'lucide-react';

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>Iniciar treino</Button>
      <Button variant="secondary">Ver plano</Button>
      <Button variant="outline">Editar</Button>
      <Button variant="ghost">Pular</Button>
      <Button variant="destructive">Excluir</Button>
      <Button variant="link">Saiba mais</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">Extra pequeno</Button>
      <Button size="sm">Pequeno</Button>
      <Button size="default">Padrão</Button>
      <Button size="lg">Grande</Button>
      <Button size="xl">Extra grande</Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>
        <Play data-icon="inline-start" />
        Começar agora
      </Button>
      <Button variant="outline">
        <Plus data-icon="inline-start" />
        Novo exercício
      </Button>
      <Button variant="secondary">
        Próximo
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>Ativo</Button>
      <Button disabled>Desabilitado</Button>
      <Button loading>Salvando</Button>
      <Button variant="outline" loading>
        Sincronizando
      </Button>
    </div>
  );
}

export function IconOnly() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button aria-label="Adicionar" size="icon-sm" variant="outline">
        <Plus />
      </Button>
      <Button aria-label="Reproduzir" size="icon">
        <Play />
      </Button>
      <Button aria-label="Excluir" size="icon-lg" variant="destructive">
        <Trash2 />
      </Button>
    </div>
  );
}
