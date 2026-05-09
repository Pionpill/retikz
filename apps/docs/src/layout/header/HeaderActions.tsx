import { ArrowUpRight, Languages, Link as LinkIcon, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { GitHubIcon } from '@/components/icons';
import { DocsSearch } from '@/components/shared/docs-search';
import { Shortcut } from '@/components/shared/shortcut';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useComponentPreviewStore } from '@/store/useComponentPreviewStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useTocStore } from '@/store/useTocStore';

import { GITHUB_URL, TIKZ_DOCS_URL, useDocActions } from './useDocActions';

// TooltipTrigger 默认即 <button>，直接套 buttonVariants；不再用 <Button asChild> 包，
// 避免 React 18 下 asChild → 自定义函数组件 ref 转发不到，触发不到 Popper 锚点。
const triggerClass = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 cursor-pointer rounded-sm');

/**
 * 顶栏右侧动作组：搜索 | GitHub / 复制链接 | 主题 / 语言 / 更多。
 * 「更多」DropdownMenu 内分组：视图开关（TOC / 布局）+ ComponentPreview 全局开关（隐代码 / 强制展开）。
 * TooltipProvider 在本组件内部自闭包，AppHeader 不必感知 Tooltip 实现。
 */
export const HeaderActions: FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, handleToggleTheme, handleCycleLang, handleCopyLink } = useDocActions();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);
  const layout = useLayoutStore(s => s.layout);
  const toggleLayout = useLayoutStore(s => s.toggleLayout);
  const previewHideCode = useComponentPreviewStore(s => s.hideCode);
  const previewIsExpand = useComponentPreviewStore(s => s.isExpand);
  const togglePreviewHideCode = useComponentPreviewStore(s => s.toggleHideCode);
  const togglePreviewIsExpand = useComponentPreviewStore(s => s.toggleIsExpand);

  const ThemeIcon = theme === 'light' ? Sun : Moon;
  const themeLabel = theme === 'light' ? t('common.themeLight') : t('common.themeDark');

  return (
    <TooltipProvider delayDuration={150}>
      <div className="ml-auto flex items-center gap-2">
        <DocsSearch />
        <Separator orientation="vertical" className="h-4!" />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              asChild
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 cursor-pointer rounded-sm')}
            >
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{t('common.github')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className={triggerClass} onClick={handleCopyLink}>
              <LinkIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              {t('toc.copyLink')}
              <Shortcut keys={['mod', 'L']} />
            </TooltipContent>
          </Tooltip>
        </div>
        <Separator orientation="vertical" className="h-4!" />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger className={triggerClass} onClick={handleToggleTheme}>
              <ThemeIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{themeLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className={triggerClass} onClick={handleCycleLang}>
              <Languages className="size-4" />
            </TooltipTrigger>
            <TooltipContent>
              {t('common.switchLanguage')} · {i18n.resolvedLanguage?.toUpperCase()}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger className={triggerClass}>
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>{t('common.more')}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('view.groupLabel')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuCheckboxItem checked={tocOpen} onCheckedChange={setTocOpen}>
                  {t('toc.outline')}
                  <DropdownMenuShortcut>
                    <Shortcut keys={['mod', 'alt', 'B']} className="tracking-normal" />
                  </DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={layout === 'centered'} onCheckedChange={toggleLayout}>
                  {t('common.layoutCentered')}
                  <DropdownMenuShortcut>
                    <Shortcut keys={['mod', 'alt', 'M']} className="tracking-normal" />
                  </DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('preview.groupLabel')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuCheckboxItem checked={previewHideCode} onCheckedChange={togglePreviewHideCode}>
                  {t('preview.hideAllCode')}
                  <DropdownMenuShortcut>
                    <Shortcut keys={['mod', 'alt', 'H']} className="tracking-normal" />
                  </DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={previewIsExpand} onCheckedChange={togglePreviewIsExpand}>
                  {t('preview.expandAllCode')}
                  <DropdownMenuShortcut>
                    <Shortcut keys={['mod', 'alt', 'E']} className="tracking-normal" />
                  </DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('common.groupResources')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem inset asChild className="cursor-pointer">
                  <a href={TIKZ_DOCS_URL} target="_blank" rel="noopener noreferrer">
                    <span className="inline-flex items-center gap-1">
                      {t('common.tikzDocs')}
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
};
