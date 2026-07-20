'use client';

import { Calendar, ChartNoAxesColumn, House, UserRound } from 'lucide-react';

import { NavLink } from '@/components/nav-link';

import { ChatOpenButton } from './chat-open-button';

export function BottomNav() {
  return (
    <nav className="sticky right-0 bottom-0 left-0 z-50 mt-auto flex items-center justify-center gap-6 rounded-t-3xl border border-border bg-background px-6 py-4">
      <NavLink href="/" icon={House} />
      <NavLink href="/workout-plan" icon={Calendar} />
      <ChatOpenButton />
      <NavLink href="/stats" icon={ChartNoAxesColumn} />
      <NavLink href="/profile" icon={UserRound} />
    </nav>
  );
}
