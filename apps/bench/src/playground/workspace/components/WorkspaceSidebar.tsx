import type { Dispatch, FC } from 'react';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';

import type { LabState, LabStateAction } from '../lab-state';

import { ModuleSwitcher } from './ModuleSwitcher';
import { TestSuiteNav } from './TestSuiteNav';
import { WorkspaceSettings } from './WorkspaceSettings';

/** Workspace Sidebar 属性 */
export type WorkspaceSidebarProps = Readonly<{
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
}>;

/** 由官方 shadcn Sidebar 原语组成的 Bench 主侧栏 */
export const WorkspaceSidebar: FC<WorkspaceSidebarProps> = props => {
  const { state, dispatch } = props;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ModuleSwitcher state={state} dispatch={dispatch} />
      </SidebarHeader>
      <SidebarContent>
        <TestSuiteNav state={state} dispatch={dispatch} />
      </SidebarContent>
      <SidebarFooter>
        <WorkspaceSettings dispatch={dispatch} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
