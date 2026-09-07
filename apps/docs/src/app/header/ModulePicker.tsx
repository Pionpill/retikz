import type { LucideIcon } from 'lucide-react';
import type { FC } from 'react';

import { BoxesIcon, ChartColumnIncreasingIcon, LibraryBigIcon, SparklesIcon, WorkflowIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

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
const MODULE_PICKER_HINT_STORAGE_KEY = 'retikz-doc-module-picker-hint-dismissed';

type ModulePickerItem = {
  value: DocScopeId;
  label: I18nKey;
  scopeLabel: string;
  description: I18nKey;
  path: string;
  icon: LucideIcon;
};

/** 模块 / About 内容页使用的首页与模块选择器。 */
export const ModulePicker: FC<ModulePickerProps> = props => {
  const { value, onNavigate, withinNavigationMenu = false } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selectScope = useDocModuleStore(state => state.selectScope);
  const [showHint, setShowHint] = useState(
    () => typeof window === 'undefined' || window.localStorage.getItem(MODULE_PICKER_HINT_STORAGE_KEY) !== 'true',
  );
  const items: Array<ModulePickerItem> = [
    {
      value: 'home',
      label: 'docs.homeNavigationLabel',
      scopeLabel: RETIKZ_BRAND,
      description: 'docs.homeNavigationDescription',
      path: '/',
      icon: SparklesIcon,
    },
    ...modules.map(module => ({
      value: module.id,
      label: module.navigationLabel,
      scopeLabel: `${RETIKZ_BRAND}.${module.id}`,
      description: module.navigationDescription,
      path: `/${module.id}`,
      icon: {
        kernel: BoxesIcon,
        library: LibraryBigIcon,
        schematic: WorkflowIcon,
        viz: ChartColumnIncreasingIcon,
      }[module.id],
    })),
  ];
  const currentLabel = items.find(item => item.value === value)?.scopeLabel ?? RETIKZ_BRAND;
  const dismissHint = () => {
    if (!showHint) return;

    window.localStorage.setItem(MODULE_PICKER_HINT_STORAGE_KEY, 'true');
    setShowHint(false);
  };

  const menuItem = (
    <NavigationMenuItem>
      <HeaderNavigationTrigger
        aria-label={t('docs.modulePickerHome')}
        className="relative max-w-40"
        onClick={event => {
          dismissHint();
          if (event.detail === 0) return;

          event.preventDefault();
          selectScope(value);
          navigate(value === 'home' ? '/' : `/${value}`);
          onNavigate?.();
        }}
      >
        <span className="truncate">{currentLabel}</span>
        {showHint ? (
          <span data-module-picker-hint className="absolute -top-0.5 -left-0.5 flex size-1.5" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
        ) : null}
      </HeaderNavigationTrigger>
      <HeaderNavigationContent className="w-80 sm:w-[36rem]">
        <div className="grid w-full grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {items.map(item => {
            const Icon = item.icon;

            return (
              <NavigationMenuLink
                key={item.value}
                active={item.value === value}
                asChild
                className="w-full flex-row items-start justify-start gap-3 rounded-md px-2.5 py-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <Link
                  to={item.path}
                  data-scope={item.value}
                  onClick={() => {
                    dismissHint();
                    selectScope(item.value);
                    onNavigate?.();
                  }}
                >
                  <span
                    data-module-picker-icon
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
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
                  </span>
                </Link>
              </NavigationMenuLink>
            );
          })}
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
