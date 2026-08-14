import type { FC } from 'react';

import { Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib';

import type { SidebarCategoryData } from './types';

import { AppSidebarModuleList } from './AppSidebarModuleList';

export type AppSidebarMenuProps = {
  /** 分组化的菜单数据 */
  categories: Array<SidebarCategoryData>;
  /** 当前激活的一级 module id（路由首段） */
  moduleId: string;
  /** 点击具体文档入口后的回调 */
  onNavigate?: () => void;
};

/**
 * 侧栏主菜单：渲染若干分组（section）
 * @description 一级 module 无 children 即叶子链接，有 children 交给 AppSidebarMenuItem（Collapsible）；一级始终铺开不做 Plus/Minus 折叠
 */
export const AppSidebarMenu: FC<AppSidebarMenuProps> = props => {
  const { categories, moduleId, onNavigate } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (categories.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <nav className="flex flex-col">
        {categories.map((category, idx) => {
          const categoryPath = category.path;
          return (
            <Fragment key={category.value}>
              {idx > 0 && <Separator className="my-3" />}
              <section className="flex flex-col">
                {category.label &&
                  (categoryPath ? (
                    <button
                      type="button"
                      className={cn(
                        'mb-1.5 flex w-full cursor-pointer items-center rounded-md px-3 py-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground',
                        pathname.toLowerCase() === categoryPath.toLowerCase() && 'text-foreground',
                      )}
                      onClick={e => {
                        e.preventDefault();
                        navigate(categoryPath);
                        onNavigate?.();
                      }}
                    >
                      <span className="truncate">{category.label}</span>
                    </button>
                  ) : (
                    <h4 className="mb-1.5 px-3 text-xs font-medium text-muted-foreground">{category.label}</h4>
                  ))}
                <AppSidebarModuleList
                  modules={category.modules}
                  moduleId={moduleId}
                  categoryValue={category.value}
                  ungrouped={category.ungrouped}
                  onNavigate={onNavigate}
                />
              </section>
            </Fragment>
          );
        })}
      </nav>
    </TooltipProvider>
  );
};
