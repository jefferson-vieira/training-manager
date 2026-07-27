import { Button, Spinner } from 'web';

export function Sizes() {
  return (
    <div className="flex items-center gap-4 text-foreground">
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  );
}

export function Tones() {
  return (
    <div className="flex items-center gap-4">
      <Spinner className="size-6 text-primary" />
      <Spinner className="size-6 text-muted-foreground" />
      <Spinner className="size-6 text-destructive" />
    </div>
  );
}

export function InlineWithText() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      Carregando seu plano de treino…
    </div>
  );
}

export function InsideButton() {
  return (
    <div className="flex items-center gap-2">
      <Button loading>Salvando</Button>
      <Button variant="outline" loading>
        Sincronizando
      </Button>
    </div>
  );
}
