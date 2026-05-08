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
 * 二级及以下菜单项。
 * - 叶子（无 children）：点击导航；激活态靠按钮自身的 bg + bold 体现
 * - 分组（有 children）：点击展开/收起；命中子项时父节点初始即展开；
 *   chevron 表示当前折叠态。子项容器不带装饰竖线，平铺缩进即可
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
    <li>
      {hasChildren ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>{button}</CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 pl-3">
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
