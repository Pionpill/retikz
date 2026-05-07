import * as React from 'react';
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function NavigationMenu({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root>) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn('relative flex max-w-max items-center', className)}
      {...props}
    >
      {children}
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn('group flex list-none items-center gap-x-6', className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn('relative', className)}
      {...props}
    />
  );
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        'inline-flex items-center text-sm font-medium transition-colors',
        'text-muted-foreground hover:text-foreground',
        'data-[active=true]:text-foreground',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
        className,
      )}
      {...props}
    />
  );
}

export { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList };
