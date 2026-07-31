import type { Dispatch, FC } from 'react';

import { Boxes, Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

import type { LabState, LabStateAction } from '../lab-state';
import type { BenchModuleIdValue } from '../workspace-model';

import { LabActionType } from '../lab-state';
import { BenchModuleId, benchModules } from '../workspace-model';

/** 模块切换器属性 */
export type ModuleSwitcherProps = Readonly<{
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
}>;

const moduleLabelKeys = {
  [BenchModuleId.Core]: 'module.core',
  [BenchModuleId.Plot]: 'module.plot',
  [BenchModuleId.Table]: 'module.table',
} as const satisfies Record<BenchModuleIdValue, string>;

const moduleDescriptionKeys = {
  [BenchModuleId.Core]: 'module.coreDescription',
  [BenchModuleId.Plot]: 'module.plotDescription',
  [BenchModuleId.Table]: 'module.tableDescription',
} as const satisfies Record<BenchModuleIdValue, string>;

/** sidebar-07 左上角模块切换器 */
export const ModuleSwitcher: FC<ModuleSwitcherProps> = props => {
  const { state, dispatch } = props;
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const selected = benchModules.find(module => module.id === state.moduleId) ?? benchModules[0];
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
                <Boxes className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{t(moduleLabelKeys[selected.id])}</span>
                <span className="truncate text-xs text-muted-foreground">{t(moduleDescriptionKeys[selected.id])}</span>
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
            {benchModules.map(module => (
              <DropdownMenuItem
                key={module.id}
                disabled={!module.available}
                className="gap-2 p-2"
                onClick={() => dispatch({ type: LabActionType.ModuleSelected, moduleId: module.id })}
              >
                <div className="flex size-6 items-center justify-center rounded-md border font-mono text-[10px]">
                  {module.id.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1">{t(moduleLabelKeys[module.id])}</span>
                {state.moduleId === module.id ? <Check className="size-4" /> : null}
                {module.available ? null : (
                  <span className="text-[10px] text-muted-foreground">{t('module.soon')}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
