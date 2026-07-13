'use client';

import { Calendar, ChartNoAxesColumn, House, UserRound } from 'lucide-react';

import { NavLink } from '@/components/nav-link';

import { ChatOpenButton } from './chat-open-button';

export function BottomNav() {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-center gap-6 rounded-t-[20px] border border-border bg-background px-6 py-4">
      <NavLink href="/" icon={House} />
      <button className="p-3">
        <Calendar className="size-6 text-foreground" />
      </button>
      <ChatOpenButton />
      <button className="p-3">
        <ChartNoAxesColumn className="size-6 text-foreground" />
      </button>
      <NavLink href="/profile" icon={UserRound} />
    </nav>
  );
}
