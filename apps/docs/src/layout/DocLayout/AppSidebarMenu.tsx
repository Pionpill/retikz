import type { FC } from 'react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useLocation, useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import type { SidebarCategoryData } from './interface';

/** AppSidebarMenu 组件 props */
export type AppSidebarMenuProps = {
  /** 分组化的菜单数据 */
  categories: Array<SidebarCategoryData>;
};

/**
 * 侧边栏主菜单：渲染若干 SidebarGroup，每组一个标题 + 一组菜单项。
 * 折叠态隐藏 group label，并在相邻 group 之间画一条细分隔线（与 fx-data-nines 同款）。
 */
export const AppSidebarMenu: FC<AppSidebarMenuProps> = props => {
  const { categories } = props;
  const { pathname } = useLocation();
  const navigate = useNavigate();

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
            <SidebarGroupLabel className="in-data-[state=collapsed]:hidden">{category.label}</SidebarGroupLabel>
          )}
          <SidebarMenu>
            {category.modules.map(module => {
              const path = `/${category.value}/${module.value}`;
              const isActive = pathname.toLowerCase() === path.toLowerCase();
              const tooltipLabel = category.label ? `${category.label} · ${module.label}` : module.label;
              const Icon = module.Icon;
              return (
                <SidebarMenuItem key={module.value}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={tooltipLabel}
                    onClick={e => {
                      e.preventDefault();
                      navigate(path);
                    }}
                  >
                    {Icon && <Icon />}
                    <span className="truncate">{module.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
};
