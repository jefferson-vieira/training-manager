import type { ComponentProps } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-3.5',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'border-border text-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-transparent bg-success text-success-foreground',
      },
    },
  },
);

function Badge({
  className,
  variant = 'default',
  ...props
}: Readonly<ComponentProps<'span'> & VariantProps<typeof badgeVariants>>) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
