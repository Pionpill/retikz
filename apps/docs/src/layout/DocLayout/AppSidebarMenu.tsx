import { Minus, Plus } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { AppSidebarMenuItem } from './AppSidebarMenuItem';
import type { SidebarCategoryData } from './interface';

/** AppSidebarMenu 组件 props */
export type AppSidebarMenuProps = {
  /** 分组化的菜单数据 */
  categories: Array<SidebarCategoryData>;
  /** 当前激活的一级 module id（路由首段，由 header switcher 控制） */
  moduleId: string;
};

/**
 * 侧边栏主菜单：渲染若干 SidebarGroup。
 * - 一级 module 无 children：渲染为普通菜单项，点击跳转 `/${moduleId}/${section}/${page}`
 * - 一级 module 有 children：渲染为 Collapsible，trigger 行带 Plus/Minus 指示，children 用 SidebarMenuSub 列出
 * - 折叠态相邻 group 之间画一条细分隔线（首组不画）
 * - 折叠态点击 trigger 自动展开 sidebar 并选中该 module
 */
export const AppSidebarMenu: FC<AppSidebarMenuProps> = props => {
  const { categories, moduleId } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  /** 当前展开的一级 module key（`category.value/module.value` = `sectionId/pageId`），同时只展开一个 */
  const [openedModule, setOpenedModule] = useState<string | undefined>(() => {
    // 路由形如 /:moduleId/:sectionId/:pageId，取后两段作为 key
    const segments = pathname.split('/').filter(Boolean);
    return segments.length >= 3 ? `${segments[1]}/${segments[2]}` : undefined;
  });

  return (
    <>
      {categories.map((category, index) => (
        <SidebarGroup
          key={category.value}
          className={cn({
            // 折叠态下相邻分组间显示一条细线（首组不画）
            'relative before:absolute before:top-0 before:left-[15%] before:h-px before:w-[70%] before:bg-border before:opacity-0 before:transition-opacity before:duration-200 before:content-[""] in-data-[state=collapsed]:before:opacity-100':
              index !== 0,
          })}
        >
          {category.label && (
            <SidebarGroupLabel className="in-data-[state=collapsed]:hidden">
              {category.label}
            </SidebarGroupLabel>
          )}
          <SidebarMenu>
            {category.modules.map(module => {
              const Icon = module.Icon;
              const modulePath = `/${moduleId}/${category.value}/${module.value}`;
              const moduleKey = `${category.value}/${module.value}`;
              const tooltipLabel = category.label
                ? `${category.label} · ${module.label}`
                : module.label;
              const hasChildren = Boolean(module.children?.length);

              if (!hasChildren) {
                const isActive = pathname.toLowerCase() === modulePath.toLowerCase();
                return (
                  <SidebarMenuItem key={module.value}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={tooltipLabel}
                      onClick={e => {
                        e.preventDefault();
                        navigate(modulePath);
                      }}
                    >
                      {Icon && <Icon />}
                      <span className="truncate">{module.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              const isOpen = openedModule === moduleKey;
              return (
                <Collapsible
                  key={module.value}
                  open={isOpen}
                  onOpenChange={open => setOpenedModule(open ? moduleKey : undefined)}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={tooltipLabel}
                        onClick={e => {
                          // 折叠态点击：自动展开 sidebar 并选中该模块
                          if (!sidebarOpen) {
                            e.preventDefault();
                            setOpenedModule(moduleKey);
                            setSidebarOpen(true);
                          }
                        }}
                      >
                        {Icon && <Icon />}
                        <span className="truncate" title={module.label}>
                          {module.label}
                        </span>
                        {isOpen ? <Minus className="ml-auto" /> : <Plus className="ml-auto" />}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="mr-0! gap-0 border-none px-0!">
                        {module.children!.map(item => (
                          <AppSidebarMenuItem
                            key={item.value}
                            item={item}
                            path={`${modulePath.toLowerCase()}/${item.value.toLowerCase()}`}
                          />
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
};
