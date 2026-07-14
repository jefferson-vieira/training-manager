import Image from 'next/image';
import Link from 'next/link';

import logo from '@/assets/imgs/logo-dark.svg';

export function Header() {
  return (
    <header className="p-5">
      <Link aria-label="Fit.ai — página inicial" href="/">
        <Image alt="Fit.ai" priority src={logo} />
      </Link>
    </header>
  );
}
