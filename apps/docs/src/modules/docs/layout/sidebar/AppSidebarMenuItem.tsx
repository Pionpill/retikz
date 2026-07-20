import type { FC } from 'react';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib';

import type { SidebarSubModuleData } from './types';

export type AppSidebarMenuItemProps = {
  item: SidebarSubModuleData;
  /** 拼好的完整路径（lower-case） */
  path: string;
  /** 点击具体文档入口后的回调 */
  onNavigate?: () => void;
};

const baseLinkClass =
  'group relative flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors text-foreground/85 hover:text-foreground hover:bg-accent/40';

const activeLinkClass = 'text-foreground font-semibold bg-accent';

/** 标准化文档路径，忽略末尾斜杠与大小写 */
const normalizeDocPath = (value: string): string => {
  const normalized = value.replace(/\/+$/, '');
  return (normalized || '/').toLowerCase();
};

/**
 * 二级及以下菜单项
 * @description 叶子点击导航；分组点击主体导航到分组文档、点击右侧 chevron 仅展开/收起（命中自身或子项时高亮，命中子项时初始展开）；子项容器不带装饰竖线
 */
export const AppSidebarMenuItem: FC<AppSidebarMenuItemProps> = props => {
  const { item, path, onNavigate } = props;
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hasChildren = Boolean(item.children?.length);
  const normalizedPathname = normalizeDocPath(pathname);
  const normalizedPath = normalizeDocPath(path);
  const isActive = normalizedPathname === normalizedPath;
  const isActiveBranch = hasChildren && normalizedPathname.startsWith(`${normalizedPath}/`);

  const [manualOpen, setManualOpen] = useState(false);
  const [collapsedAtPath, setCollapsedAtPath] = useState<string | null>(null);
  const open = isActiveBranch ? collapsedAtPath !== normalizedPathname : manualOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (isActiveBranch) {
      setCollapsedAtPath(nextOpen ? null : normalizedPathname);
      return;
    }

    setManualOpen(nextOpen);
  };

  if (!hasChildren) {
    return (
      <li>
        <button
          type="button"
          className={cn(baseLinkClass, isActive && activeLinkClass)}
          onClick={e => {
            e.preventDefault();
            navigate(path);
            onNavigate?.();
          }}
        >
          <span className="truncate">{item.label}</span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div className={cn(baseLinkClass, isActive && activeLinkClass)}>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center text-left"
            onClick={e => {
              e.preventDefault();
              navigate(path);
              onNavigate?.();
            }}
          >
            <span className="truncate">{item.label}</span>
          </button>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={open ? t('common.collapseSection') : t('common.expandSection')}
              className="-my-1 ml-1"
            >
              <ChevronRight className="transition-transform" style={{ transform: `rotate(${open ? 90 : 0}deg)` }} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 pl-3">
            {item.children!.map(child => (
              <AppSidebarMenuItem
                key={child.value}
                item={child}
                path={`${path}/${child.value.toLowerCase()}`}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
};
