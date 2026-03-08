import {
  Calendar,
  ChartNoAxesColumn,
  House,
  Sparkles,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

export function BottomNav() {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-center gap-6 rounded-t-[20px] border border-border bg-background px-6 py-4">
      <Link className="p-3" href="/">
        <House className="size-6 text-foreground" />
      </Link>
      <button className="p-3">
        <Calendar className="size-6 text-foreground" />
      </button>
      <button className="rounded-full bg-primary p-4">
        <Sparkles className="size-6 text-primary-foreground" />
      </button>
      <button className="p-3">
        <ChartNoAxesColumn className="size-6 text-foreground" />
      </button>
      <button className="p-3">
        <UserRound className="size-6 text-foreground" />
      </button>
    </nav>
  );
}
