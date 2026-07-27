import { Badge } from 'web';
import { Calendar, Check, Flame, TriangleAlert } from 'lucide-react';

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Ativo</Badge>
      <Badge variant="secondary">Rascunho</Badge>
      <Badge variant="outline">Opcional</Badge>
      <Badge variant="success">Concluído</Badge>
      <Badge variant="destructive">Atrasado</Badge>
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="success">
        <Check />
        Treino concluído
      </Badge>
      <Badge variant="secondary">
        <Calendar />
        Segunda
      </Badge>
      <Badge>
        <Flame />
        7 dias seguidos
      </Badge>
      <Badge variant="destructive">
        <TriangleAlert />
        Plano expirado
      </Badge>
    </div>
  );
}

export function OnWorkoutCard() {
  return (
    <div className="flex w-fit flex-col gap-5 rounded-xl bg-muted p-5">
      <Badge className="border-0 bg-foreground/8 py-1.5 text-foreground uppercase backdrop-blur-sm">
        <Calendar />
        Domingo
      </Badge>
      <span className="font-heading text-2xl leading-[1.05] font-semibold text-foreground">
        Descanso
      </span>
    </div>
  );
}
