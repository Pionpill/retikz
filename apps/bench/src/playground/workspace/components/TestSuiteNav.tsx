import type { Dispatch, FC } from 'react';

import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import type { LabState, LabStateAction } from '../lab-state';

import { LabActionType } from '../lab-state';
import { getModuleTestSuites } from '../workspace-model';

/** 测试集导航属性 */
export type TestSuiteNavProps = Readonly<{
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
}>;

/** 按当前模块展示已接入执行器的真实测试集 */
export const TestSuiteNav: FC<TestSuiteNavProps> = props => {
  const { state, dispatch } = props;
  const { t } = useTranslation();
  const suites = getModuleTestSuites(state.moduleId);
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sidebar.testSuites')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {suites.map(suite => (
            <SidebarMenuItem key={suite.id}>
              <SidebarMenuButton
                isActive={suite.scenarioId === state.scenarioId}
                tooltip={t('sidebar.singleEntityUpdate')}
                onClick={() => dispatch({ type: LabActionType.ScenarioSelected, scenarioId: suite.scenarioId })}
              >
                <Activity />
                <span>{t('sidebar.singleEntityUpdate')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        {suites.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">{t('module.soon')}</p>
        ) : (
          <p className="px-2 pt-2 text-[11px] leading-4 text-muted-foreground group-data-[collapsible=icon]:hidden">
            {t('sidebar.singleEntityUpdateDescription')}
          </p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
