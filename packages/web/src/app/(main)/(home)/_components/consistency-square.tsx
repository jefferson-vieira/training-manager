interface ConsistencySquareProps {
  completed: boolean;
  isToday: boolean;
  started: boolean;
}

export function ConsistencySquare({
  completed,
  isToday,
  started,
}: ConsistencySquareProps) {
  if (completed) {
    return <div className="size-5 rounded-md bg-primary" />;
  }

  if (started) {
    return <div className="size-5 rounded-md bg-primary/20" />;
  }

  if (isToday) {
    return <div className="size-5 rounded-md border-[1.6px] border-primary" />;
  }

  return <div className="size-5 rounded-md border border-border" />;
}
