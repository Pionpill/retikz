import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib';

export type AboutNavProps = {
  /** 移动端抽屉使用的纵向布局覆盖。 */
  mobile?: boolean;
  /** 点击 About 页面入口后的关闭回调。 */
  onNavigate?: () => void;
  /** 是否只渲染导航项，用于嵌入统一的顶栏 NavigationMenu。 */
  withinNavigationMenu?: boolean;
};

/** 首页模块导航后的 About 入口。 */
export const AboutNav: FC<AboutNavProps> = props => {
  const { mobile = false, onNavigate, withinNavigationMenu = false } = props;
  const { t } = useTranslation();

  const item = (
    <NavigationMenuItem className={cn('flex items-center', mobile && 'w-full')}>
      <NavigationMenuLink
        asChild
        aria-label={t('about.label')}
        className={cn(
          'h-8 rounded-md px-2.5 py-1.5 focus-visible:ring-0 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
          mobile && 'w-full justify-start px-2 py-1.5',
        )}
      >
        <Link to="/about/overview" onClick={onNavigate}>
          {t('about.label')}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );

  if (withinNavigationMenu) return item;

  return (
    <NavigationMenu className={cn(mobile ? 'w-full max-w-none' : 'hidden lg:flex')}>
      <NavigationMenuList className={cn(mobile && 'w-full gap-x-0 gap-y-1')}>{item}</NavigationMenuList>
    </NavigationMenu>
  );
};
