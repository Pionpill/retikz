import { ArrowUpRight, Languages, Link as LinkIcon, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { GitHubIcon } from '@/components/icons';
import { COMPARISON_TARGETS, ComparisonTargetLabelKeys } from '@/components/shared/comparison';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useComparisonStore } from '@/store/useComparisonStore';
import { useComponentPreviewStore } from '@/store/useComponentPreviewStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useTocStore } from '@/store/useTocStore';

import { AUTHOR_GITHUB_URL, GITHUB_URL, TIKZ_DOCS_URL, useDocActions } from './useDocActions';
import { useHeaderCompact } from './useHeaderCompact';

// TooltipTrigger 默认即 `<button>`，直接套 buttonVariants；不用 `<Button asChild>` 包，避免 React 18 下 asChild → 自定义函数组件 ref 转发不到，触发不到 Popper 锚点
const triggerClass = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 cursor-pointer rounded-sm');

/**
 * 顶栏右侧动作组
 * @description 桌面（lg+）GitHub / 复制链接 / 主题 / 语言 / 更多 平铺；移动端（< lg）只保留 More 按钮，前四项折进 Dropdown 顶部分组；TooltipProvider 内部自闭包。AI 触发器由 AppHeader 直接放在中间，不再属于这里
 */
export const HeaderActions: FC = () => {
  const { t, i18n } = useTranslation();
  const compact = useHeaderCompact();
  const { theme, handleToggleTheme, handleCycleLang, handleCopyLink } = useDocActions();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);
  const layout = useLayoutStore(s => s.layout);
  const toggleLayout = useLayoutStore(s => s.toggleLayout);
  const previewHideCode = useComponentPreviewStore(s => s.hideCode);
  const previewIsExpand = useComponentPreviewStore(s => s.isExpand);
  const previewDragEnabled = useComponentPreviewStore(s => s.dragEnabled);
  const togglePreviewHideCode = useComponentPreviewStore(s => s.toggleHideCode);
  const togglePreviewIsExpand = useComponentPreviewStore(s => s.toggleIsExpand);
  const togglePreviewDragEnabled = useComponentPreviewStore(s => s.toggleDragEnabled);
  const comparisonTargets = useComparisonStore(s => s.visibleTargets);
  const setComparisonTargetVisible = useComparisonStore(s => s.setTargetVisible);

  const ThemeIcon = theme === 'light' ? Sun : Moon;
  const themeLabel = theme === 'light' ? t('common.themeLight') : t('common.themeDark');

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2">
        <div className="hidden @4xl/header:flex items-center gap-1">
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
        <Separator orientation="vertical" className="hidden @4xl/header:block h-4!" />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger className={cn(triggerClass, 'hidden @4xl/header:inline-flex')} onClick={handleToggleTheme}>
              <ThemeIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{themeLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className={cn(triggerClass, 'hidden @4xl/header:inline-flex')} onClick={handleCycleLang}>
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
            <DropdownMenuContent align="end" className={cn('w-56', !compact && 'w-72')}>
              {/* 紧凑模式独占：把桌面顶栏的主题 / 语言 / 复制链接 / GitHub 收纳进来 */}
              {compact && (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleToggleTheme} className="cursor-pointer">
                      <ThemeIcon className="size-4" />
                      {themeLabel}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCycleLang} className="cursor-pointer">
                      <Languages className="size-4" />
                      {t('common.switchLanguage')}
                      <DropdownMenuShortcut>{i18n.resolvedLanguage?.toUpperCase()}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                      <LinkIcon className="size-4" />
                      {t('toc.copyLink')}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                        <GitHubIcon className="size-4" />
                        {t('common.github')}
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('view.groupLabel')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuCheckboxItem checked={tocOpen} onCheckedChange={setTocOpen}>
                  {t('toc.outline')}
                  {!compact && (
                    <DropdownMenuShortcut>
                      <Shortcut keys={['mod', 'alt', 'B']} className="tracking-normal" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={layout === 'centered'} onCheckedChange={toggleLayout}>
                  {t('common.layoutCentered')}
                  {!compact && (
                    <DropdownMenuShortcut>
                      <Shortcut keys={['mod', 'alt', 'M']} className="tracking-normal" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('preview.groupLabel')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuCheckboxItem checked={previewHideCode} onCheckedChange={togglePreviewHideCode}>
                  {t('preview.hideAllCode')}
                  {!compact && (
                    <DropdownMenuShortcut>
                      <Shortcut keys={['mod', 'alt', 'H']} className="tracking-normal" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={previewIsExpand} onCheckedChange={togglePreviewIsExpand}>
                  {t('preview.expandAllCode')}
                  {!compact && (
                    <DropdownMenuShortcut>
                      <Shortcut keys={['mod', 'alt', 'E']} className="tracking-normal" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={previewDragEnabled} onCheckedChange={togglePreviewDragEnabled}>
                  {t('preview.dragComponent')}
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger inset>{t('comparison.groupLabel')}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {COMPARISON_TARGETS.map(target => (
                    <DropdownMenuCheckboxItem
                      key={target}
                      checked={comparisonTargets[target]}
                      onCheckedChange={checked => setComparisonTargetVisible(target, checked === true)}
                    >
                      {t(ComparisonTargetLabelKeys[target])}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
              <DropdownMenuSeparator />
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('common.groupContact')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem inset asChild className="cursor-pointer">
                  <a href={AUTHOR_GITHUB_URL} target="_blank" rel="noopener noreferrer">
                    <span className="inline-flex items-center gap-1">
                      {t('common.contactGithub')}
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
