import { Textarea } from 'web';

export function Default() {
  return (
    <div className="w-80">
      <Textarea placeholder="Como você se sentiu neste treino?" />
    </div>
  );
}

export function Filled() {
  return (
    <div className="w-80">
      <Textarea defaultValue="Consegui subir a carga no supino para 60kg. Ombro direito incomodou um pouco na última série, vale reduzir o volume na próxima semana." />
    </div>
  );
}

export function States() {
  return (
    <div className="flex w-80 flex-col gap-3">
      <Textarea placeholder="Padrão" />
      <Textarea disabled placeholder="Desabilitado" />
      <Textarea aria-invalid defaultValue="Muito curto" />
    </div>
  );
}
