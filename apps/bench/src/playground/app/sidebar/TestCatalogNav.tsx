import type { FC } from 'react';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

import type { BenchModule } from '../module-registry';
import type { BenchCaseStatusValue, BenchTestDirection } from '../test-catalog';

import { BenchCaseStatus, BenchCaseView, getBenchCasePath, getModuleTestGroups } from '../test-catalog';

/** 测试目录导航属性 */
export type TestCatalogNavProps = Readonly<{
  /** 当前模块 */
  module: BenchModule;
  /** 当前用例标识 */
  activeCaseId?: string;
  /** 用例最近状态 */
  caseStatuses?: Readonly<Partial<Record<string, BenchCaseStatusValue>>>;
}>;

const statusKeys: Readonly<Record<BenchCaseStatusValue, string>> = Object.freeze({
  [BenchCaseStatus.NotRun]: 'status.notRun',
  [BenchCaseStatus.Running]: 'status.running',
  [BenchCaseStatus.Passed]: 'status.passed',
  [BenchCaseStatus.Warning]: 'status.warning',
  [BenchCaseStatus.Failed]: 'status.failed',
});

const statusClasses: Readonly<Record<BenchCaseStatusValue, string>> = Object.freeze({
  [BenchCaseStatus.NotRun]: 'bg-muted-foreground/35',
  [BenchCaseStatus.Running]: 'animate-pulse bg-sky-500',
  [BenchCaseStatus.Passed]: 'bg-emerald-500',
  [BenchCaseStatus.Warning]: 'bg-amber-500',
  [BenchCaseStatus.Failed]: 'bg-destructive',
});

/** 返回当前用例所属的测试方向 */
const findActiveDirectionId = (
  directions: ReadonlyArray<BenchTestDirection>,
  activeCaseId: string | undefined,
): string | undefined =>
  directions.find(direction => direction.cases.some(testCase => testCase.id === activeCaseId))?.id;

/** 返回方向中需要聚合提示的状态数量 */
const countAttentionStatuses = (
  direction: BenchTestDirection,
  caseStatuses: Readonly<Partial<Record<string, BenchCaseStatusValue>>>,
): number =>
  direction.cases.filter(testCase => {
    const status = caseStatuses[testCase.id];
    return (
      status === BenchCaseStatus.Running || status === BenchCaseStatus.Warning || status === BenchCaseStatus.Failed
    );
  }).length;

/** 按分组、方向和用例展示当前模块的测试目录 */
export const TestCatalogNav: FC<TestCatalogNavProps> = props => {
  const { module, activeCaseId, caseStatuses = {} } = props;
  const { t } = useTranslation();
  const groups = getModuleTestGroups(module.id);
  const directions = groups.flatMap(group => group.directions);
  const activeDirectionId = findActiveDirectionId(directions, activeCaseId);
  const [openDirectionId, setOpenDirectionId] = useState<string | undefined>(activeDirectionId);

  return groups.map(group => (
    <SidebarGroup key={group.id}>
      <SidebarGroupLabel>{t(group.title)}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.directions.map(direction => {
            const Icon = direction.icon;
            const isOpen = openDirectionId === direction.id;
            const attentionCount = countAttentionStatuses(direction, caseStatuses);
            return (
              <Collapsible
                key={direction.id}
                asChild
                open={isOpen}
                onOpenChange={open => setOpenDirectionId(open ? direction.id : undefined)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={t(direction.title)} isActive={isOpen}>
                      <Icon />
                      <span>{t(direction.title)}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {attentionCount === 0 ? null : <SidebarMenuBadge>{attentionCount}</SidebarMenuBadge>}
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-3.5 mr-0 pl-2.5 pr-0">
                      {direction.cases.length === 0 ? (
                        <SidebarMenuSubItem>
                          <span className="block px-2 py-1.5 text-xs text-muted-foreground">
                            {t('catalog.emptyDirection')}
                          </span>
                        </SidebarMenuSubItem>
                      ) : (
                        direction.cases.map(testCase => {
                          const status = caseStatuses[testCase.id] ?? BenchCaseStatus.NotRun;
                          return (
                            <SidebarMenuSubItem key={testCase.id}>
                              <SidebarMenuSubButton asChild isActive={testCase.id === activeCaseId}>
                                <NavLink to={getBenchCasePath(module.id, testCase.id, BenchCaseView.Run)}>
                                  <span>{t(testCase.title)}</span>
                                  <span
                                    className={`mr-1 ml-auto size-1.5 shrink-0 rounded-full ${statusClasses[status]}`}
                                    aria-label={t(statusKeys[status])}
                                  />
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
};
