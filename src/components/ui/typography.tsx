'use client';

import { cn } from '@/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';
import React, { FC, useEffect, useImperativeHandle, useRef } from 'react';

const typographyVariants = cva('max-w-full', {
  variants: {
    variant: {
      default: '',
      header: 'text-4xl font-bold',
      subHeader: 'text-3xl font-bold',
      title: 'text-2xl font-bold',
      subTitle: "text-xl",
      caption: "text-sm opacity-60",
    },
    wrap: {
      false: 'truncate',
      wrap: 'break-words',
    },
  },
  defaultVariants: {
    variant: 'default',
    wrap: false,
  },
});

export interface TypographyProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof typographyVariants> {
  ref?: React.Ref<HTMLSpanElement>;
}

const Typography: FC<TypographyProps> = props => {
  const { variant, wrap, className, ref, children, ...resProps } = props;
  const innerRef = useRef<HTMLSpanElement>(null!);

  useImperativeHandle(ref, () => innerRef.current);

  useEffect(() => {
    if (innerRef.current) {
      const { scrollWidth, clientWidth } = innerRef.current;
      if (typeof children === 'string' && scrollWidth > clientWidth) {
        innerRef.current.title = children;
      }
    }
  });

  return (
    <span className={cn(typographyVariants({ variant, wrap, className }))} ref={innerRef} {...resProps}>
      {children}
    </span>
  );
};

Typography.displayName = 'Typography';

export { Typography };
