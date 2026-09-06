import type { ComponentProps, FC } from 'react';

import { ChevronDownIcon } from 'lucide-react';
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui';

import { cn } from '@/lib';

export type HeaderNavigationTriggerProps = ComponentProps<typeof NavigationMenuPrimitive.Trigger> & {
  /** 是否显示下拉指示图标。 */
  showChevron?: boolean;
};

/** 文档站 Header 统一的下拉导航触发器。 */
export const HeaderNavigationTrigger: FC<HeaderNavigationTriggerProps> = props => {
  const { className, children, showChevron = true, ...rest } = props;

  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="header-navigation-trigger"
      className={cn(
        'group inline-flex h-8 w-max items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-0 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
        className,
      )}
      {...rest}
    >
      {children}
      {showChevron && (
        <ChevronDownIcon
          className="relative top-px ml-1 size-3 transition-transform duration-300 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      )}
    </NavigationMenuPrimitive.Trigger>
  );
};
