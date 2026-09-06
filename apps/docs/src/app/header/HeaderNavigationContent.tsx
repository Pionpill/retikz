import type { ComponentProps, FC } from 'react';

import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui';

import { cn } from '@/lib';

export type HeaderNavigationContentProps = ComponentProps<typeof NavigationMenuPrimitive.Content>;

/** 文档站 Header 统一的下拉菜单容器。 */
export const HeaderNavigationContent: FC<HeaderNavigationContentProps> = props => {
  const { className, ...rest } = props;

  return (
    <NavigationMenuPrimitive.Content
      data-slot="header-navigation-content"
      className={cn(
        'absolute top-full left-0 z-50 mt-1 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none',
        'data-[motion=from-end]:animate-in data-[motion=from-start]:animate-in data-[motion=to-end]:animate-out data-[motion=to-start]:animate-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52',
        className,
      )}
      {...rest}
    />
  );
};
