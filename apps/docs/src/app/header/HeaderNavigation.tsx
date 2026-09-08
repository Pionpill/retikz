import type { FC } from 'react';

import type { DocNavigationContext } from '@/modules/docs/layout';

import { NavigationMenu, NavigationMenuList } from '@/components/ui/navigation-menu';
import { cn } from '@/lib';

import { AboutNav } from './AboutNav';
import { ModuleNav } from './ModuleNav';
import { ModulePicker } from './ModulePicker';
import { SectionNav } from './SectionNav';

export type HeaderNavigationProps = {
  /** 当前 URL 对应的导航上下文。 */
  navigation: DocNavigationContext;
  /** 移动端抽屉使用的纵向布局。 */
  mobile?: boolean;
  /** 点击导航入口后的关闭回调。 */
  onNavigate?: () => void;
};

/** 将顶栏所有入口放入同一层 NavigationMenu。 */
export const HeaderNavigation: FC<HeaderNavigationProps> = props => {
  const { navigation, mobile = false, onNavigate } = props;

  return (
    <NavigationMenu className={cn(mobile ? 'w-full max-w-none' : 'hidden lg:flex')}>
      <NavigationMenuList className={cn('gap-x-2 gap-y-2', mobile && 'w-full flex-col items-stretch gap-x-0 gap-y-1')}>
        {navigation.areaId === null || navigation.areaId === 'about' ? (
          <>
            <ModulePicker value="home" onNavigate={onNavigate} withinNavigationMenu />
            <ModuleNav mobile={mobile} onNavigate={onNavigate} withinNavigationMenu />
            <AboutNav mobile={mobile} onNavigate={onNavigate} withinNavigationMenu />
          </>
        ) : (
          <>
            <ModulePicker value={navigation.moduleId ?? 'home'} onNavigate={onNavigate} withinNavigationMenu />
            <SectionNav
              mobile={mobile}
              areaId={navigation.areaId}
              sectionId={navigation.sectionId}
              onNavigate={onNavigate}
              withinNavigationMenu
            />
          </>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
};
