import type { Dispatch, FC } from 'react';

import {
  Activity,
  BarChart3,
  Box,
  Ellipsis,
  FlaskConical,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  Play,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

import type { LabPolicyIdValue, LabRunModeValue } from '../../modules/core';
import type { BenchModule } from '../constant';
import type { LabState, LabStateAction } from '../lab-state';

import { kernelLabPolicies, LabBackend, LabRunMode } from '../../modules/core';
import { LabActionType, LabStatus } from '../lab-state';

/** Workspace Header 属性 */
export type WorkspaceHeaderProps = Readonly<{
  /** 当前一级路由对应的模块 */
  module: BenchModule;
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
  onRun: () => void;
}>;

const modes: ReadonlyArray<Readonly<{ id: LabRunModeValue; icon: typeof Activity }>> = Object.freeze([
  Object.freeze({ id: LabRunMode.Inspect, icon: Activity }),
  Object.freeze({ id: LabRunMode.Compare, icon: GitCompareArrows }),
  Object.freeze({ id: LabRunMode.Measure, icon: FlaskConical }),
]);

/** 工作台常用配置与运行入口 */
export const WorkspaceHeader: FC<WorkspaceHeaderProps> = props => {
  const { module, state, dispatch, onRun } = props;
  const { t } = useTranslation();
  const { isMobile, openMobile, state: sidebarState } = useSidebar();
  const sidebarExpanded = isMobile ? openMobile : sidebarState === 'expanded';
  const sidebarLabel = t(sidebarExpanded ? 'header.collapseSidebar' : 'header.expandSidebar');
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <SidebarTrigger className="-ml-1" aria-label={sidebarLabel} title={sidebarLabel} />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="hidden xl:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <span className="text-muted-foreground">{t(module.title)}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t(module.available ? 'sidebar.singleEntityUpdate' : 'module.soon')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <div className="flex items-center rounded-lg border bg-muted/40 p-1">
          {modes.map(mode => {
            const Icon = mode.icon;
            const label = t(`header.${mode.id}`);
            return (
              <Button
                key={mode.id}
                size="icon-sm"
                variant={state.mode === mode.id ? 'secondary' : 'ghost'}
                aria-label={label}
                title={label}
                disabled={!module.available}
                onClick={() => dispatch({ type: LabActionType.ModeSelected, mode: mode.id })}
              >
                <Icon />
              </Button>
            );
          })}
        </div>

        <div className="hidden items-center rounded-lg border bg-muted/40 p-1 sm:flex">
          {Object.values(LabBackend).map(backend => (
            <Button
              key={backend}
              size="icon-sm"
              variant={state.backend === backend ? 'secondary' : 'ghost'}
              aria-label={backend.toUpperCase()}
              title={backend.toUpperCase()}
              disabled={!module.available}
              onClick={() => dispatch({ type: LabActionType.BackendSelected, backend })}
            >
              {backend === LabBackend.Svg ? <Layers3 /> : <Box />}
            </Button>
          ))}
        </div>

        <Select
          disabled={!module.available}
          value={state.policyId}
          onValueChange={value => dispatch({ type: LabActionType.PolicySelected, policyId: value as LabPolicyIdValue })}
        >
          <SelectTrigger aria-label={t('header.updatePolicy')} className="hidden w-[150px] md:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kernelLabPolicies.map(policy => (
              <SelectItem key={policy.id} value={policy.id}>
                {policy.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {state.session === undefined ? null : (
          <Button
            variant={state.reportOpen ? 'secondary' : 'ghost'}
            size="icon"
            aria-label={t(state.reportOpen ? 'header.closeReport' : 'header.openReport')}
            onClick={() =>
              dispatch({
                type: state.reportOpen ? LabActionType.ReportClosed : LabActionType.ReportOpened,
              })
            }
          >
            <BarChart3 />
          </Button>
        )}
        <Button onClick={onRun} disabled={!module.available || state.status === LabStatus.Running}>
          {state.status === LabStatus.Running ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Play className="fill-current" />
          )}
          <span className="hidden sm:inline">
            {t(state.status === LabStatus.Running ? 'header.running' : 'header.run')}
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('header.details')}
          disabled={!module.available}
          onClick={() => dispatch({ type: LabActionType.DetailsOpened })}
        >
          <Ellipsis />
        </Button>
      </div>
    </header>
  );
};
