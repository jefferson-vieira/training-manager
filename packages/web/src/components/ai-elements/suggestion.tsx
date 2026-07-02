'use client';

import type { ComponentProps } from 'react';

import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  children,
  className,
  ...props
}: SuggestionsProps) => (
  <ScrollArea className="w-full overflow-x-auto whitespace-nowrap" {...props}>
    <div className={cn('flex w-max flex-nowrap items-center gap-2', className)}>
      {children}
    </div>

    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, 'onClick'> & {
  onClick?: (suggestion: string) => void;
  suggestion: string;
};

export const Suggestion = ({
  children,
  className,
  onClick,
  size = 'sm',
  suggestion,
  variant = 'outline',
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn('cursor-pointer rounded-full px-4', className)}
      size={size}
      type="button"
      variant={variant}
      onClick={handleClick}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
