import { Check, ChevronsUpDown } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { modules } from '@/data/module';
import { cn } from '@/lib/utils';

/** AppSidebarHeader 组件 props */
export type AppSidebarHeaderProps = {
  /** 当前激活模块 id（受控） */
  activeId: string;
  /** 选择条目时回调 */
  onActiveIdChange: (id: string) => void;
};

/** 侧边栏头部：retikz 子包切换器 */
export const AppSidebarHeader: FC<AppSidebarHeaderProps> = props => {
  const { activeId, onActiveIdChange } = props;
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const active = modules.find(m => m.id === activeId) ?? modules[0];
  const ActiveIcon = active.Icon;

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <DropdownMenuTrigger>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ActiveIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{t(active.label)}</span>
                  <span className="truncate text-xs opacity-60">
                    retikz · {t('common.versionTag')}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </DropdownMenuTrigger>
            </SidebarMenuButton>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {t('common.brandTagline')}
              </DropdownMenuLabel>
              {modules.map(m => {
                const Icon = m.Icon;
                const isCurrent = active.id === m.id;
                return (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => onActiveIdChange(m.id)}
                    className="flex items-center p-2 justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md border bg-foreground">
                        <Icon className="size-3.5 shrink-0 text-background" />
                      </div>
                      <span
                        className={cn('text-muted-foreground', {
                          'text-foreground': isCurrent,
                        })}
                      >
                        {t(m.label)}
                      </span>
                    </div>
                    {isCurrent ? <Check /> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
};
