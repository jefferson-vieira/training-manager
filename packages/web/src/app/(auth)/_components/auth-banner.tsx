import Image from 'next/image';

import logo from '@/assets/imgs/logo.svg';

export function AuthBanner() {
  return (
    // min-h keeps the photo strip from collapsing to nothing on short
    // viewports, where the sheet grows past the fold and leaves no free space.
    <div className="relative flex min-h-48 flex-1 flex-col overflow-hidden px-6 pt-9 lg:min-h-0 lg:w-[51.875%] lg:flex-none lg:justify-between lg:p-12">
      <Image
        alt=""
        className="object-cover"
        fetchPriority="high"
        fill
        loading="eager"
        sizes="(min-width: 1024px) 52vw, 100vw"
        src="/login-bg.png"
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_top,#000_2%,transparent_66%)] lg:bg-[linear-gradient(243deg,transparent_34%,#000_100%)]" />

      <Image alt="FIT.AI" className="relative mx-auto lg:mx-0" src={logo} />

      <div className="relative hidden flex-col gap-5 lg:flex">
        <h2 className="max-w-130 font-heading text-5xl leading-[1.05] font-semibold text-white">
          O app que vai transformar a forma como você treina.
        </h2>

        <p className="max-w-110 font-heading text-base leading-normal text-white/70">
          Planos personalizados, acompanhamento de consistência e um Coach IA
          que ajusta o treino com você.
        </p>
      </div>
    </div>
  );
}
