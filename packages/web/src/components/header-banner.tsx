import type { ReactNode } from 'react';

import Image from 'next/image';

import logo from '@/assets/imgs/logo.svg';

type HeaderBannerProps = {
  children: ReactNode;
  src: string;
};

export function HeaderBanner({ children, src }: Readonly<HeaderBannerProps>) {
  return (
    <div className="relative flex h-74 shrink-0 flex-col items-start justify-between overflow-hidden rounded-b-3xl px-5 pt-5 pb-10">
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          alt=""
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={src}
        />

        <div className="absolute inset-0 bg-[linear-gradient(243deg,rgba(0,0,0,0)_34%,rgb(0,0,0)_100%)]" />
      </div>

      <Image alt="Fit.ai" className="relative" priority src={logo} />

      <div className="relative w-full">{children}</div>
    </div>
  );
}
