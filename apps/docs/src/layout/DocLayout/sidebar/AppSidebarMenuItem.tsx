import { ChevronRight } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import type { SidebarSubModuleData } from './interface';

export type AppSidebarMenuItemProps = {
  item: SidebarSubModuleData;
  /** 拼好的完整路径（lower-case） */
  path: string;
};

const baseLinkClass =
  'group relative flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors text-foreground/85 hover:text-foreground hover:bg-accent/40';

const activeLinkClass = 'text-foreground font-semibold bg-accent';

/**
 * 二级及以下菜单项：左侧带一根竖线、激活时显示圆点。
 * - 叶子（无 children）：点击导航
 * - 分组（有 children）：点击展开/收起，递归渲染子项；命中子项时父节点自动展开
 *
 * 不依赖 shadcn Sidebar；纯 ul/li + Collapsible。
 */
export const AppSidebarMenuItem: FC<AppSidebarMenuItemProps> = props => {
  const { item, path } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hasChildren = Boolean(item.children?.length);
  const isLeafActive = !hasChildren && pathname.toLowerCase() === path.toLowerCase();

  const [open, setOpen] = useState(
    () => hasChildren && pathname.toLowerCase().startsWith(`${path.toLowerCase()}/`),
  );

  const button = (
    <button
      type="button"
      className={cn(baseLinkClass, isLeafActive && activeLinkClass)}
      onClick={
        hasChildren
          ? undefined
          : e => {
              e.preventDefault();
              navigate(path);
            }
      }
    >
      <span className="truncate">{item.label}</span>
      {hasChildren && (
        <ChevronRight
          className="ml-auto size-3.5 shrink-0 transition-transform"
          style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
        />
      )}
    </button>
  );

  return (
    <li
      className={cn(
        'relative',
        // 激活态在按钮左侧显示圆点
        isLeafActive &&
          'before:absolute before:top-1/2 before:-left-[3px] before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-foreground/70 before:content-[""]',
      )}
    >
      {hasChildren ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>{button}</CollapsibleTrigger>
          <CollapsibleContent>
            <ul
              className={cn(
                'relative ml-3 mt-0.5 flex flex-col gap-0.5 pl-3',
                'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:rounded-full before:bg-border',
              )}
            >
              {item.children!.map(child => (
                <AppSidebarMenuItem
                  key={child.value}
                  item={child}
                  path={`${path}/${child.value.toLowerCase()}`}
                />
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        button
      )}
    </li>
  );
};
