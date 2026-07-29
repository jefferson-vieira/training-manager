import type { VariantProps } from 'class-variance-authority';
import type { Route } from 'next';
import type { ComponentProps } from 'react';

import NextLink from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ExternalLinkProps = Omit<ComponentProps<'a'>, 'rel' | 'target'>;

type LinkProps<T extends string> = Omit<ComponentProps<'a'>, 'href'> &
  VariantProps<typeof buttonVariants> & {
    href: Route<T>;
  };

/**
 * External link. Renders a plain anchor with the button's `link` variant,
 * always opening in a new tab.
 */
export function ExternalLink({
  className,
  ...props
}: Readonly<ExternalLinkProps>) {
  return (
    <a
      className={cn(
        buttonVariants({ className, variant: 'link' }),
        'inline h-auto p-0 text-[length:inherit] whitespace-normal',
      )}
      data-slot="link"
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    />
  );
}

export function Link<T extends string>({
  className,
  href,
  size,
  variant = 'link',
  ...props
}: Readonly<LinkProps<T>>) {
  return (
    <NextLink
      className={cn(
        buttonVariants({
          className,
          size,
          variant,
        }),
        'inline h-auto p-0 text-[length:inherit] whitespace-normal',
      )}
      href={href}
      {...props}
    />
  );
}
