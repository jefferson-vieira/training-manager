import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback } from './avatar';

interface Props {
  className: string;
  name: string;
}

export function ChatHeader({ className, name }: Props) {
  return (
    <header className={cn('flex gap-2', className)}>
      <Avatar size="lg">
        <AvatarFallback>
          <Sparkles color="var(--primary)" />
        </AvatarFallback>
      </Avatar>

      <div>
        <h1 className="font-semibold">{name}</h1>

        <p className="flex items-center gap-1 text-xs">
          <span className="block size-2 rounded-full bg-green-600 bg-blend-color ring-2 ring-background select-none" />{' '}
          Online
        </p>
      </div>
    </header>
  );
}
