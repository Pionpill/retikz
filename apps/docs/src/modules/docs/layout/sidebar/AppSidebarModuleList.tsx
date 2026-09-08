import type { FC } from 'react';

import { Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib';
import { DocDifficultyDot } from '@/modules/docs/components';

import type { SidebarModuleData } from './types';

import { AppSidebarMenuItem } from './AppSidebarMenuItem';

export type AppSidebarModuleListProps = {
  /** 当前列表中的文档入口。 */
  modules: Array<SidebarModuleData>;
  /** 当前模块 id。 */
  moduleId: string;
  /** 当前 section id。 */
  categoryValue: string;
  /** 是否跳过 section URL 段。 */
  ungrouped?: boolean;
  /** 点击具体文档入口后的回调。 */
  onNavigate?: () => void;
};

const leafBase =
  'group flex w-full cursor-pointer items-center rounded-md px-3 py-1.5 text-[13px] transition-colors text-foreground/85 hover:text-foreground hover:bg-accent/40';

const leafActive = 'text-foreground font-semibold bg-accent';

/** 渲染一个侧栏文件夹或 section 下的文档入口列表。 */
export const AppSidebarModuleList: FC<AppSidebarModuleListProps> = props => {
  const { modules, moduleId, categoryValue, ungrouped, onNavigate } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <ul className="flex flex-col gap-0.5">
      {modules.map((module, index) => {
        const ModuleIcon = module.Icon;
        const modulePath = ungrouped ? `/${moduleId}/${module.value}` : `/${moduleId}/${categoryValue}/${module.value}`;
        const hasChildren = Boolean(module.children?.length);
        const isSidebarGroupStart =
          module.sidebarGroup !== undefined && module.sidebarGroup !== modules[index - 1]?.sidebarGroup;
        const sidebarGroup = isSidebarGroupStart ? (
          <>
            {index > 0 && (
              <li aria-hidden="true">
                <Separator className="my-3" />
              </li>
            )}
            <li>
              <h4 className="mb-1.5 px-3 text-xs font-medium text-muted-foreground">{module.sidebarGroup}</h4>
            </li>
          </>
        ) : null;

        if (!hasChildren) {
          const isActive = pathname.toLowerCase() === modulePath.toLowerCase();
          return (
            <Fragment key={module.value}>
              {sidebarGroup}
              <li>
                <button
                  type="button"
                  className={cn(leafBase, isActive && leafActive)}
                  onClick={e => {
                    e.preventDefault();
                    navigate(modulePath);
                    onNavigate?.();
                  }}
                >
                  {ModuleIcon && <ModuleIcon className="mr-1.5 size-3.5 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate text-left">{module.label}</span>
                  <DocDifficultyDot difficulty={module.difficulty} />
                </button>
              </li>
            </Fragment>
          );
        }

        return (
          <Fragment key={module.value}>
            {sidebarGroup}
            <AppSidebarMenuItem
              item={{
                value: module.value,
                label: module.label,
                Icon: module.Icon,
                children: module.children,
              }}
              path={modulePath.toLowerCase()}
              onNavigate={onNavigate}
            />
          </Fragment>
        );
      })}
    </ul>
  );
};
