import { NavLink } from 'web';
import { ChartLine, Dumbbell, House, User } from 'lucide-react';

/* usePathname() is stubbed to '/' in the design-sync bundle, so the item whose
   href is '/' renders in the active (primary) tone and the rest render inert —
   which is exactly the pair of states worth showing. */

export function BottomNav() {
  return (
    <div className="flex w-72 items-center justify-around rounded-2xl border border-border bg-background p-1 shadow-sm">
      <NavLink href="/" icon={House} />
      <NavLink href="/treinos" icon={Dumbbell} />
      <NavLink href="/progresso" icon={ChartLine} />
      <NavLink href="/perfil" icon={User} />
    </div>
  );
}

export function ActiveAndInactive() {
  return (
    <div className="flex items-center gap-6 text-xs text-muted-foreground">
      <div className="flex flex-col items-center">
        <NavLink href="/" icon={House} />
        Ativo
      </div>
      <div className="flex flex-col items-center">
        <NavLink href="/treinos" icon={Dumbbell} />
        Inativo
      </div>
    </div>
  );
}
