import { ChevronRight } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { SidebarSubModuleData } from './interface';

/** AppSidebarMenuItem 组件 props */
export type AppSidebarMenuItemProps = {
  item: SidebarSubModuleData;
  /** 拼好的完整路径（lower-case） */
  path: string;
};

const subItemClassName = cn(
  'relative pl-2',
  "before:content-[''] before:absolute before:left-0 before:inset-y-1 before:h-full before:w-px before:rounded-full before:bg-sidebar-border",
);

/**
 * 二级及以下菜单项：左侧带一根竖线、激活时显示圆点。
 * - 叶子（无 children）：点击导航
 * - 分组（有 children）：点击展开/收起，递归渲染子项；命中子项时父节点自动展开
 */
export const AppSidebarMenuItem: FC<AppSidebarMenuItemProps> = props => {
  const { item, path } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hasChildren = Boolean(item.children?.length);
  const isLeafActive = !hasChildren && pathname.toLowerCase() === path.toLowerCase();
  // 子项命中时父节点自动展开
  const [open, setOpen] = useState(
    () => hasChildren && pathname.toLowerCase().startsWith(`${path.toLowerCase()}/`),
  );

  const subButton = (
    <SidebarMenuSubButton
      className={cn(
        'cursor-pointer truncate text-[12px] opacity-60 transition-opacity duration-200',
        { 'opacity-100': isLeafActive },
      )}
      isActive={isLeafActive}
      onClick={
        hasChildren
          ? undefined
          : e => {
              e.preventDefault();
              navigate(path);
            }
      }
    >
      {item.label}
      {hasChildren && (
        <ChevronRight
          className="ml-auto shrink-0"
          style={{ transform: `rotate(${open ? 90 : 0}deg)`, transition: 'transform 200ms ease' }}
        />
      )}
    </SidebarMenuSubButton>
  );

  const subItem = (
    <SidebarMenuSubItem
      className={cn(subItemClassName, {
        "after:content-[''] after:absolute after:top-1/2 after:-left-0.5 after:size-1.5 after:-translate-y-1/2 after:rounded-full after:bg-foreground/60":
          isLeafActive,
      })}
    >
      {hasChildren ? <CollapsibleTrigger asChild>{subButton}</CollapsibleTrigger> : subButton}
      {hasChildren && (
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0! gap-0 border-none px-0!">
            {item.children!.map(child => (
              <AppSidebarMenuItem
                key={child.value}
                item={child}
                path={`${path}/${child.value.toLowerCase()}`}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      )}
    </SidebarMenuSubItem>
  );

  return hasChildren ? (
    <Collapsible open={open} onOpenChange={setOpen}>
      {subItem}
    </Collapsible>
  ) : (
    subItem
  );
};
