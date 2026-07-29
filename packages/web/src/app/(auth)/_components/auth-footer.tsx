import { Heart } from 'lucide-react';

import { ExternalLink } from '@/components/ui/link';

export function AuthFooter() {
  return (
    <footer className="flex flex-col items-center gap-1 font-heading text-xs">
      <p>©2026 Copyright FIT.AI. Todos os direitos reservados</p>

      <p className="inline-flex items-center gap-1">
        Feito com
        <Heart className="size-3 fill-red-600 text-red-600" />
        por
        <ExternalLink
          aria-label="Fale comigo no LinkedIn"
          href="https://www.linkedin.com/in/jefferson-vieira-da-silva"
        >
          Jefferson Vieira da Silva
        </ExternalLink>
      </p>
    </footer>
  );
}
