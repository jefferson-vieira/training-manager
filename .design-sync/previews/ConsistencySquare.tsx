import { ConsistencySquare } from 'web';

export function States() {
  return (
    <div className="flex flex-col gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <ConsistencySquare completed isToday={false} started />
        Concluído
      </div>
      <div className="flex items-center gap-2">
        <ConsistencySquare completed={false} isToday={false} started />
        Iniciado
      </div>
      <div className="flex items-center gap-2">
        <ConsistencySquare completed={false} isToday started={false} />
        Hoje
      </div>
      <div className="flex items-center gap-2">
        <ConsistencySquare completed={false} isToday={false} started={false} />
        Pendente
      </div>
    </div>
  );
}

export function WeekStrip() {
  const week = [
    { completed: true, isToday: false, started: true },
    { completed: true, isToday: false, started: true },
    { completed: false, isToday: false, started: true },
    { completed: true, isToday: false, started: true },
    { completed: false, isToday: true, started: false },
    { completed: false, isToday: false, started: false },
    { completed: false, isToday: false, started: false },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {week.map((day, i) => (
          <ConsistencySquare key={i} {...day} />
        ))}
      </div>
      <div className="flex gap-1.5">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((label, i) => (
          <span
            key={i}
            className="w-5 text-center text-[10px] text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
