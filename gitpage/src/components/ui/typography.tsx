'use client';

import { cn } from '@/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';
import React, { FC, useEffect, useImperativeHandle, useRef } from 'react';

const typographyVariants = cva('truncate', {
  variants: {
    variant: {
      default: '',
      hint: 'opacity-60',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface TypographyProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof typographyVariants> {
  ref?: React.Ref<HTMLSpanElement>;
}

const Typography: FC<TypographyProps> = props => {
  const { variant, className, ref, children, ...resProps } = props;
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
    <span className={cn(typographyVariants({ variant, className }))} ref={innerRef} {...resProps}>
      {children}
    </span>
  );
};

Typography.displayName = 'Typography';

export { Typography, typographyVariants };
