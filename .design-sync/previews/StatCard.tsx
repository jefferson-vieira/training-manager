import { StatCard } from 'web';
import { Dumbbell, Flame, Timer, TrendingUp } from 'lucide-react';

export function Default() {
  return <StatCard icon={Flame} label="Sequência atual" value="7 dias" />;
}

export function Grid() {
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-3">
      <StatCard icon={Flame} label="Sequência atual" value="7 dias" />
      <StatCard icon={Dumbbell} label="Treinos no mês" value="18" />
      <StatCard icon={Timer} label="Tempo total" value="12h 40min" />
      <StatCard icon={TrendingUp} label="Volume semanal" value="+12%" />
    </div>
  );
}

export function LongValue() {
  return (
    <div className="w-44">
      <StatCard icon={Timer} label="Duração média por treino" value="1h 05min" />
    </div>
  );
}
