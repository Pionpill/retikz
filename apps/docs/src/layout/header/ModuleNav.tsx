import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { modules } from '@/data/module';

/**
 * 顶栏水平模块切换：core / flow / plot。
 * 激活态由路由 :moduleId 决定；点击走 react-router <Link> 切到该模块默认页。
 * 默认页拼接由 App.tsx 的 ModuleRedirect 兜底（/:moduleId 自动跳到首栏首页）。
 */
export const ModuleNav: FC = () => {
  const { t } = useTranslation();
  const { moduleId } = useParams<'moduleId'>();

  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        {modules.map(m => {
          const active = moduleId === m.id;
          return (
            <NavigationMenuItem key={m.id}>
              <NavigationMenuLink active={active} asChild>
                <Link to={`/${m.id}`}>{t(m.label)}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
};
