import type { Dispatch, FC } from 'react';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';

import type { LabState, LabStateAction } from '../lab-state';
import type { BenchModule } from '../module-registry';
import type { BenchCaseStatusValue } from '../test-catalog';

import { ModuleSwitcher } from './ModuleSwitcher';
import { SidebarSettings } from './SidebarSettings';
import { TestCatalogNav } from './TestCatalogNav';

/** Workspace Sidebar 属性 */
export type AppSidebarProps = Readonly<{
  /** 当前一级路由对应的模块 */
  module: BenchModule;
  /** 当前路由用例标识 */
  activeCaseId?: string;
  /** 用例最近报告状态 */
  caseStatuses?: Readonly<Partial<Record<string, BenchCaseStatusValue>>>;
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
}>;

/** 由官方 shadcn Sidebar 原语组成的 Bench 主侧栏 */
export const AppSidebar: FC<AppSidebarProps> = props => {
  const { module, activeCaseId, caseStatuses, dispatch } = props;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ModuleSwitcher module={module} />
      </SidebarHeader>
      <SidebarContent>
        <TestCatalogNav module={module} activeCaseId={activeCaseId} caseStatuses={caseStatuses} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarSettings dispatch={dispatch} detailsDisabled={!module.available} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
