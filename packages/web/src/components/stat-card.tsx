import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl bg-primary/8 p-5">
      <div className="flex items-center justify-center rounded-full bg-primary/8 p-2.25">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-heading text-2xl leading-[1.15] font-semibold text-foreground">
          {value}
        </span>
        <span className="font-heading text-xs leading-[1.4] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
