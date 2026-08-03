import type { FC } from 'react';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

import type { BenchModule } from '../module-registry';

import { benchModules } from '../module-registry';

/** 模块切换器属性 */
export type ModuleSwitcherProps = Readonly<{
  /** 当前一级路由对应的模块 */
  module: BenchModule;
}>;

/** sidebar-07 左上角模块切换器 */
export const ModuleSwitcher: FC<ModuleSwitcherProps> = props => {
  const { module } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const SelectedIcon = module.icon;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <SidebarMenuButton
            asChild
            size="lg"
            title={t('module.switch')}
            className="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <DropdownMenuTrigger>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <SelectedIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{t(module.title)}</span>
                <span className="truncate text-xs text-muted-foreground">{t(module.description)}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </DropdownMenuTrigger>
          </SidebarMenuButton>
          <DropdownMenuContent
            className="z-[60] w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('module.switch')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {benchModules.map(item => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem key={item.id} className="gap-2 p-2" onClick={() => navigate(item.path)}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Icon className="size-3.5" />
                  </div>
                  <span className="flex-1">{t(item.title)}</span>
                  {module.id === item.id ? <Check className="size-4" /> : null}
                  {item.available ? null : (
                    <span className="text-[10px] text-muted-foreground">{t('module.soon')}</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
