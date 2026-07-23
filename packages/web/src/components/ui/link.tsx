import type { VariantProps } from 'class-variance-authority';
import type { Route } from 'next';
import type { ComponentProps } from 'react';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

type ButtonLinkProps<T extends string> = Omit<ComponentProps<'a'>, 'href'> &
  VariantProps<typeof buttonVariants> & {
    href: Route<T>;
  };

export function LinkButton<T extends string>({
  className,
  href,
  size,
  variant = 'link',
  ...props
}: Readonly<ButtonLinkProps<T>>) {
  return (
    <Link
      className={buttonVariants({
        className,
        size,
        variant,
      })}
      href={href}
      {...props}
    />
  );
}
