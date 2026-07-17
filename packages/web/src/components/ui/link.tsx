import type { VariantProps } from 'class-variance-authority';
import type { Route } from 'next';
import type { ComponentProps } from 'react';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

type ButtonLinkProps = Omit<ComponentProps<'a'>, 'href'> &
  VariantProps<typeof buttonVariants> & {
    href: Route;
  };

export function LinkButton({
  className,
  href,
  size,
  variant = 'link',
  ...props
}: Readonly<ButtonLinkProps>) {
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
