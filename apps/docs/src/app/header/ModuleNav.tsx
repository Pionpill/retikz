import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib';
import { modules } from '@/modules/docs/data';

export type ModuleNavProps = {
  /** 覆盖默认的桌面端显示类，用于移动端首页抽屉复用。 */
  className?: string;
  /** 移动端抽屉使用的纵向布局覆盖。 */
  mobile?: boolean;
  /** 点击模块入口后的关闭回调。 */
  onNavigate?: () => void;
  /** 是否只渲染导航项，用于嵌入统一的顶栏 NavigationMenu。 */
  withinNavigationMenu?: boolean;
};

/**
 * 顶栏水平模块入口
 * @description 只列出四个真实模块；激活态由 pathname 首段决定，About 不进入该列表
 */
export const ModuleNav: FC<ModuleNavProps> = props => {
  const { className, mobile = false, onNavigate, withinNavigationMenu = false } = props;
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const moduleId = pathname.split('/').filter(Boolean)[0];

  const items = modules.map(m => {
    const active = moduleId === m.id;
    return (
      <NavigationMenuItem key={m.id} className="flex items-center">
        <NavigationMenuLink
          active={active}
          asChild
          className={cn(
            'h-8 rounded-md px-2.5 py-1.5 focus-visible:ring-0 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            mobile && 'w-full justify-start px-2 py-1.5',
            active && 'text-foreground',
          )}
        >
          <Link to={`/${m.id}`} onClick={onNavigate}>
            {t(m.navigationLabel)}
          </Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  });

  if (withinNavigationMenu) return <>{items}</>;

  return (
    <NavigationMenu className={cn(mobile ? 'w-full max-w-none' : 'hidden lg:flex', className)}>
      <NavigationMenuList className={cn(mobile && 'w-full flex-col items-stretch gap-x-0 gap-y-1')}>
        {items}
      </NavigationMenuList>
    </NavigationMenu>
  );
};
