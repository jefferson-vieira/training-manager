/* Stands in for next/image inside the design-sync bundle.
   The real next/image bundles to a module object rather than a component
   ("Element type is invalid … but got: object") and its default loader points
   at /_next/image, which does not exist outside a Next server. */
import * as React from 'react';

type NextImageProps = Omit<React.ComponentProps<'img'>, 'src'> & {
  blurDataURL?: string;
  fill?: boolean;
  loader?: unknown;
  placeholder?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  src: string | { src: string };
  unoptimized?: boolean;
};

export default function Image({
  alt = '',
  blurDataURL: _blurDataURL,
  fill,
  loader: _loader,
  placeholder: _placeholder,
  priority: _priority,
  quality: _quality,
  src,
  style,
  unoptimized: _unoptimized,
  ...rest
}: NextImageProps) {
  // Static imports (`import logo from './logo.svg'`) arrive as the esbuild
  // dataurl string; next/font-style objects still carry `.src`.
  const resolved = typeof src === 'string' ? src : src?.src;

  // `fill` is layout-critical here: the callers absolutely position the cover
  // image and derive no height from it.
  const fillStyle: React.CSSProperties = fill
    ? { height: '100%', inset: 0, position: 'absolute', width: '100%' }
    : {};

  return (
    <img
      alt={alt}
      src={resolved}
      style={{ ...fillStyle, ...style }}
      {...rest}
    />
  );
}
