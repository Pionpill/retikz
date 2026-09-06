import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DocScopeId, I18nKey } from '@/modules/docs/data';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { modules } from '@/modules/docs/data';
import { useDocModuleStore } from '@/modules/docs/store';

import { HeaderNavigationContent } from './HeaderNavigationContent';
import { HeaderNavigationTrigger } from './HeaderNavigationTrigger';

export type ModulePickerProps = {
  /** 当前选择器值；About 内容页使用 home 作为其 home-owned 状态。 */
  value: DocScopeId;
  /** 移动端选择后执行的关闭回调。 */
  onNavigate?: () => void;
  /** 是否只渲染导航项，用于嵌入统一的顶栏 NavigationMenu。 */
  withinNavigationMenu?: boolean;
};

const RETIKZ_BRAND = 'retikz';

type ModulePickerItem = {
  value: DocScopeId;
  label: I18nKey;
  scopeLabel: string;
  description: I18nKey;
  path: string;
};

/** 模块 / About 内容页使用的首页与模块选择器。 */
export const ModulePicker: FC<ModulePickerProps> = props => {
  const { value, onNavigate, withinNavigationMenu = false } = props;
  const { t } = useTranslation();
  const selectScope = useDocModuleStore(state => state.selectScope);
  const items: Array<ModulePickerItem> = [
    {
      value: 'home',
      label: 'docs.homeNavigationLabel',
      scopeLabel: RETIKZ_BRAND,
      description: 'docs.homeNavigationDescription',
      path: '/',
    },
    ...modules.map(module => ({
      value: module.id,
      label: module.navigationLabel,
      scopeLabel: `${RETIKZ_BRAND}.${module.id}`,
      description: module.navigationDescription,
      path: `/${module.id}`,
    })),
  ];
  const currentLabel = items.find(item => item.value === value)?.scopeLabel ?? RETIKZ_BRAND;

  const menuItem = (
    <NavigationMenuItem>
      <HeaderNavigationTrigger aria-label={t('docs.modulePickerHome')} className="max-w-40">
        <span className="truncate">{currentLabel}</span>
      </HeaderNavigationTrigger>
      <HeaderNavigationContent className="w-80 sm:w-[36rem]">
        <div className="grid w-full grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {items.map(item => (
            <NavigationMenuLink
              key={item.value}
              active={item.value === value}
              asChild
              className="w-full flex-col items-start justify-start rounded-md px-2.5 py-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <Link
                to={item.path}
                data-scope={item.value}
                onClick={() => {
                  selectScope(item.value);
                  onNavigate?.();
                }}
              >
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span data-module-picker-title className="text-sm font-medium text-foreground">
                    {t(item.label)}
                  </span>
                  <span data-module-picker-scope className="shrink-0 font-mono text-xs text-muted-foreground">
                    {item.scopeLabel}
                  </span>
                </span>
                <span data-module-picker-description className="mt-1 block text-sm leading-5 text-muted-foreground">
                  {t(item.description)}
                </span>
              </Link>
            </NavigationMenuLink>
          ))}
        </div>
      </HeaderNavigationContent>
    </NavigationMenuItem>
  );

  if (withinNavigationMenu) return menuItem;

  return (
    <NavigationMenu className="shrink-0">
      <NavigationMenuList className="gap-0">{menuItem}</NavigationMenuList>
    </NavigationMenu>
  );
};
