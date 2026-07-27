import { Badge, HeaderBanner } from 'web';
import { Calendar } from 'lucide-react';

const COVER =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=70';

export function Default() {
  return (
    <div className="w-96">
      <HeaderBanner src={COVER}>
        <h1 className="font-heading text-3xl leading-[1.05] font-semibold text-background">
          Peito e Tríceps
        </h1>
      </HeaderBanner>
    </div>
  );
}

export function WithMeta() {
  return (
    <div className="w-96">
      <HeaderBanner src={COVER}>
        <div className="flex flex-col gap-3">
          <Badge className="border-0 bg-background/16 py-1.5 text-background uppercase backdrop-blur-sm">
            <Calendar />
            Segunda
          </Badge>
          <h1 className="font-heading text-3xl leading-[1.05] font-semibold text-background">
            Peito e Tríceps
          </h1>
          <span className="font-heading text-xs text-background/70">
            60min · 8 exercícios
          </span>
        </div>
      </HeaderBanner>
    </div>
  );
}
