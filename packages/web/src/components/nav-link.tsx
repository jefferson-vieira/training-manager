'use client';

import type { LucideIcon } from 'lucide-react';
import type { Route } from 'next';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type NavLinkProps = {
  href: Route;
  icon: LucideIcon;
};

export function NavLink({ href, icon: Icon }: NavLinkProps) {
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <Link className="p-3" href={href}>
      <Icon
        className={cn('size-6', isActive ? 'text-primary' : 'text-foreground')}
      />
    </Link>
  );
}
