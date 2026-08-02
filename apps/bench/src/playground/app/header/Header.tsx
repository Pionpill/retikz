import type { Dispatch, FC } from 'react';

import {
  BarChart3,
  Box,
  Eye,
  FileBarChart,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  Play,
  Settings2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { LabBackendValue, LabPolicyIdValue } from '../../modules/kernel';
import type { LabState, LabStateAction } from '../lab-state';
import type { BenchModule } from '../module-registry';
import type { BenchCaseViewValue, BenchTestCase } from '../test-catalog';

import { kernelLabPolicies, LabBackend } from '../../modules/kernel';
import { LabActionType, LabStatus } from '../lab-state';
import { BenchCaseView, getBenchCasePath, getBenchTestCaseContext } from '../test-catalog';

const caseViews = Object.freeze([
  Object.freeze({ id: BenchCaseView.Preview, icon: Eye }),
  Object.freeze({ id: BenchCaseView.Benchmark, icon: BarChart3 }),
  Object.freeze({ id: BenchCaseView.Reports, icon: FileBarChart }),
]);

/** Workspace Header 属性 */
export type HeaderProps = Readonly<{
  /** 当前一级路由对应的模块 */
  module: BenchModule;
  /** 当前路由对应的测试用例 */
  testCase?: BenchTestCase;
  /** 当前用例页面 */
  view: BenchCaseViewValue;
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
  onRun: () => void;
}>;

/** 工作台常用配置与运行入口 */
export const Header: FC<HeaderProps> = props => {
  const { module, testCase, view, state, dispatch, onRun } = props;
  const { t } = useTranslation();
  const { isMobile, openMobile, state: sidebarState } = useSidebar();
  const sidebarExpanded = isMobile ? openMobile : sidebarState === 'expanded';
  const sidebarLabel = t(sidebarExpanded ? 'header.collapseSidebar' : 'header.expandSidebar');
  const caseContext = testCase === undefined ? undefined : getBenchTestCaseContext(module.id, testCase.id);
  const isPreview = view === BenchCaseView.Preview;
  const isBenchmark = view === BenchCaseView.Benchmark;
  const runLabel = t(isBenchmark ? 'header.startBenchmark' : 'header.runPreview');
  const selectedPolicy = kernelLabPolicies.find(policy => policy.id === state.policyId);
  const getPolicyLabel = (policy: (typeof kernelLabPolicies)[number]) =>
    t(`policy.${policy.id}`, { defaultValue: policy.label });
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <SidebarTrigger className="-ml-1" aria-label={sidebarLabel} title={sidebarLabel} />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0 overflow-hidden">
        <BreadcrumbList className="flex-nowrap">
          {caseContext === undefined ? (
            <>
              <BreadcrumbItem className="min-w-0">
                <span className="truncate text-muted-foreground">{t(module.title)}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">{t('module.soon')}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <>
              <BreadcrumbItem className="hidden min-w-0 xl:flex">
                <span className="truncate text-muted-foreground">{t(caseContext.direction.title)}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden shrink-0 xl:block" />
              <BreadcrumbItem className="hidden min-w-0 md:flex">
                <BreadcrumbPage className="truncate">{t(caseContext.testCase.title)}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {testCase === undefined ? null : (
          <Tabs value={view} className="shrink-0 gap-0">
            <TabsList aria-label={t('header.caseViews')}>
              {caseViews.map(item => {
                const Icon = item.icon;
                const label = t(`caseView.${item.id}`);
                return (
                  <TabsTrigger key={item.id} value={item.id} asChild>
                    <NavLink to={getBenchCasePath(module.id, testCase.id, item.id)} aria-label={label} title={label}>
                      <Icon />
                      <span className="hidden xl:inline">{label}</span>
                    </NavLink>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}
        {isPreview || isBenchmark ? (
          <Tabs
            value={state.backend}
            className="shrink-0 gap-0"
            onValueChange={backend =>
              dispatch({ type: LabActionType.BackendSelected, backend: backend as LabBackendValue })
            }
          >
            <TabsList aria-label={t('caseView.backend')}>
              {Object.values(LabBackend).map(backend => {
                const label = backend === LabBackend.Svg ? 'SVG' : 'Canvas';
                return (
                  <TabsTrigger
                    key={backend}
                    value={backend}
                    aria-label={label}
                    title={label}
                    disabled={!module.available}
                  >
                    {backend === LabBackend.Svg ? <Layers3 /> : <Box />}
                    <span>{label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        ) : null}

        {isPreview ? (
          <Select
            disabled={!module.available}
            value={state.policyId}
            onValueChange={value =>
              dispatch({ type: LabActionType.PolicySelected, policyId: value as LabPolicyIdValue })
            }
          >
            <SelectTrigger aria-label={t('header.updatePolicy')} className="hidden w-[150px] xl:flex">
              <SelectValue>
                {selectedPolicy === undefined ? state.policyId : getPolicyLabel(selectedPolicy)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {kernelLabPolicies.map(policy => (
                <SelectItem key={policy.id} value={policy.id}>
                  {getPolicyLabel(policy)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {isBenchmark ? (
          <div
            className="hidden h-9 w-[150px] items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground xl:flex"
            aria-label={t('header.allPolicies')}
          >
            <GitCompareArrows className="size-4" />
            <span>{t('header.allPolicies')}</span>
          </div>
        ) : null}

        {isPreview || isBenchmark ? (
          <Button
            aria-label={runLabel}
            title={runLabel}
            onClick={onRun}
            disabled={!module.available || state.status === LabStatus.Running}
          >
            {state.status === LabStatus.Running ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Play className="fill-current" />
            )}
            <span className="hidden xl:inline">
              {t(
                state.status === LabStatus.Running
                  ? 'header.running'
                  : isBenchmark
                    ? 'header.startBenchmark'
                    : 'header.runPreview',
              )}
            </span>
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="icon"
          aria-label={t('header.settings')}
          title={t('header.settings')}
          disabled={!module.available}
          onClick={() => dispatch({ type: LabActionType.DetailsOpened })}
        >
          <Settings2 />
        </Button>
      </div>
    </header>
  );
};
