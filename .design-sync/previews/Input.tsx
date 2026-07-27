import { Input } from 'web';

export function Default() {
  return (
    <div className="w-72">
      <Input placeholder="Nome do treino" />
    </div>
  );
}

export function WithLabel() {
  return (
    <div className="flex w-72 flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor="peso">
        Peso corporal (kg)
      </label>
      <Input defaultValue="82,5" id="peso" type="text" />
    </div>
  );
}

export function States() {
  return (
    <div className="flex w-72 flex-col gap-3">
      <Input placeholder="Padrão" />
      <Input defaultValue="Preenchido" />
      <Input disabled placeholder="Desabilitado" />
      <Input readOnly defaultValue="Somente leitura" />
    </div>
  );
}

export function Invalid() {
  return (
    <div className="flex w-72 flex-col gap-1.5">
      <Input aria-invalid defaultValue="email-invalido" />
      <span className="text-xs text-destructive">Informe um e-mail válido.</span>
    </div>
  );
}
