import { ScrollArea } from 'web';

const EXERCISES = [
  'Supino reto com barra',
  'Supino inclinado com halteres',
  'Crucifixo na polia',
  'Paralelas',
  'Tríceps testa',
  'Tríceps corda',
  'Elevação lateral',
  'Abdominal infra',
];

export function VerticalList() {
  return (
    <ScrollArea className="h-48 w-72 rounded-lg border border-border">
      <div className="flex flex-col p-1">
        {EXERCISES.map((exercise) => (
          <div
            key={exercise}
            className="rounded-md px-3 py-2 text-sm text-foreground"
          >
            {exercise}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function LongText() {
  return (
    <ScrollArea className="h-40 w-80 rounded-lg border border-border">
      <p className="p-4 text-sm leading-relaxed text-muted-foreground">
        Aqueça por cinco minutos antes de iniciar as séries principais. Mantenha
        a escápula retraída durante todo o movimento do supino e controle a fase
        excêntrica em dois segundos. Descanse entre 90 e 120 segundos entre as
        séries compostas e cerca de 60 segundos nos exercícios isolados. Se a
        última repetição sair sem falha técnica, aumente a carga em 2,5kg na
        próxima sessão. Registre as cargas ao final de cada exercício para que o
        plano da semana seguinte seja ajustado automaticamente.
      </p>
    </ScrollArea>
  );
}
