/* Stands in for next/link inside the design-sync bundle.
   The real next/link needs the App Router context to mount and bundles to a
   module object the same way next/image does. A plain anchor is the honest
   equivalent for a static preview and for a rendered design. */
import * as React from 'react';

type NextLinkProps = Omit<React.ComponentProps<'a'>, 'href'> & {
  href: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
};

export default function Link({
  children,
  href,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  ...rest
}: NextLinkProps) {
  const resolved = typeof href === 'string' ? href : (href?.pathname ?? '#');

  return (
    <a href={resolved} {...rest}>
      {children}
    </a>
  );
}
