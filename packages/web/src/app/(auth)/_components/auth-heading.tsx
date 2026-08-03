import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const authHeadingVariants = cva('flex flex-col items-center text-center', {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      center: 'max-w-80 gap-2',
      default: 'gap-2.5 lg:items-start lg:gap-1.5 lg:text-left',
    },
  },
});

type AuthHeadingProps = VariantProps<typeof authHeadingVariants> & {
  className?: string;
  description: string;
  title: string;
};

export function AuthHeading({
  className,
  description,
  title,
  variant = 'default',
}: Readonly<AuthHeadingProps>) {
  return (
    <div className={cn(authHeadingVariants({ variant }), className)}>
      <h1 className="font-heading text-lg leading-tight font-semibold text-foreground lg:text-2xl">
        {title}
      </h1>

      <p className="text-sm leading-normal text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
