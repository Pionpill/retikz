import { type FC, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { AppSidebarMenuItem } from './AppSidebarMenuItem';
import type { SidebarCategoryData } from './interface';

export type AppSidebarMenuProps = {
  /** 分组化的菜单数据 */
  categories: Array<SidebarCategoryData>;
  /** 当前激活的一级 module id（路由首段） */
  moduleId: string;
};

const leafBase =
  'group flex w-full cursor-pointer items-center rounded-md px-3 py-1.5 text-[13px] transition-colors text-foreground/85 hover:text-foreground hover:bg-accent/40';

const leafActive = 'text-foreground font-semibold bg-accent';

/**
 * 侧栏主菜单：渲染若干分组（section）。
 * - 一级 module 无 children：叶子链接，点击跳路由
 * - 一级 module 有 children：交给 AppSidebarMenuItem（Collapsible + 左竖线）
 * - 一级始终铺开，不做 Plus/Minus 折叠
 * - 分组之间用 Separator 横线分隔
 */
export const AppSidebarMenu: FC<AppSidebarMenuProps> = props => {
  const { categories, moduleId } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav className="flex flex-col">
      {categories.map((category, idx) => (
        <Fragment key={category.value}>
          {idx > 0 && <Separator className="my-3" />}
          <section className="flex flex-col">
            {category.label && (
              <h4 className="mb-1.5 px-3 text-xs font-medium text-muted-foreground">{category.label}</h4>
            )}
            <ul className="flex flex-col gap-0.5">
              {category.modules.map(module => {
                const modulePath = category.ungrouped
                  ? `/${moduleId}/${module.value}`
                  : `/${moduleId}/${category.value}/${module.value}`;
                const hasChildren = Boolean(module.children?.length);

                if (!hasChildren) {
                  const isActive = pathname.toLowerCase() === modulePath.toLowerCase();
                  return (
                    <li key={module.value}>
                      <button
                        type="button"
                        className={cn(leafBase, isActive && leafActive)}
                        onClick={e => {
                          e.preventDefault();
                          navigate(modulePath);
                        }}
                      >
                        <span className="truncate">{module.label}</span>
                      </button>
                    </li>
                  );
                }

                return (
                  <AppSidebarMenuItem
                    key={module.value}
                    item={{
                      value: module.value,
                      label: module.label,
                      children: module.children,
                    }}
                    path={modulePath.toLowerCase()}
                  />
                );
              })}
            </ul>
          </section>
        </Fragment>
      ))}
    </nav>
  );
};
