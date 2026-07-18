import { ArrowUpRight, Languages, Link as LinkIcon, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { GitHubIcon } from '@/components/icons';
import { Shortcut } from '@/components/shared';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib';
import { ComparisonTargetLabelKeys, ComparisonTargetList } from '@/modules/docs/data';
import { useComparisonStore, useComponentPreviewStore, useTocStore } from '@/modules/docs/store';
import { useLayoutStore } from '@/store';

import { AUTHOR_GITHUB_URL, GITHUB_URL, TIKZ_DOCS_URL, useDocActions } from './useDocActions';

// TooltipTrigger 默认即 `<button>`，直接套 buttonVariants；不用 `<Button asChild>` 包，避免 React 18 下 asChild → 自定义函数组件 ref 转发不到，触发不到 Popper 锚点
const triggerClass = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 cursor-pointer rounded-sm');

/** 顶栏右侧动作组。 */
export const HeaderActions: FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, handleToggleTheme, handleCycleLang, handleCopyLink } = useDocActions();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);
  /** 当前页无目录内容时隐藏 TOC 开关（右栏不占位，开关无意义） */
  const hasToc = useTocStore(state => state.hasToc);
  const layout = useLayoutStore(s => s.layout);
  const toggleLayout = useLayoutStore(s => s.toggleLayout);
  const previewHideCode = useComponentPreviewStore(s => s.hideCode);
  const previewIsExpand = useComponentPreviewStore(s => s.isExpand);
  const previewDragEnabled = useComponentPreviewStore(s => s.dragEnabled);
  const previewRendererMode = useComponentPreviewStore(s => s.rendererMode);
  const previewAnimationMode = useComponentPreviewStore(s => s.animationMode);
  const previewThemeMode = useComponentPreviewStore(s => s.themeMode);
  const previewControlPanelDefaultOpen = useComponentPreviewStore(s => s.controlPanelDefaultOpen);
  const togglePreviewHideCode = useComponentPreviewStore(s => s.toggleHideCode);
  const togglePreviewIsExpand = useComponentPreviewStore(s => s.toggleIsExpand);
  const togglePreviewDragEnabled = useComponentPreviewStore(s => s.toggleDragEnabled);
  const togglePreviewRendererMode = useComponentPreviewStore(s => s.toggleRendererMode);
  const setPreviewAnimationMode = useComponentPreviewStore(s => s.setAnimationMode);
  const setPreviewThemeMode = useComponentPreviewStore(s => s.setThemeMode);
  const setPreviewControlPanelDefaultOpen = useComponentPreviewStore(s => s.setControlPanelDefaultOpen);
  const comparisonTargets = useComparisonStore(s => s.visibleTargets);
  const setComparisonTargetVisible = useComparisonStore(s => s.setTargetVisible);

  const ThemeIcon = theme === 'light' ? Sun : Moon;
  const themeLabel = theme === 'light' ? t('common.themeLight') : t('common.themeDark');

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-1">
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
        <Separator orientation="vertical" className="hidden lg:block h-4!" />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger className={cn(triggerClass, 'hidden lg:inline-flex')} onClick={handleToggleTheme}>
              <ThemeIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{themeLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className={cn(triggerClass, 'hidden lg:inline-flex')} onClick={handleCycleLang}>
              <Languages className="size-4" />
            </TooltipTrigger>
            <TooltipContent>
              {t('common.switchLanguage')} · {i18n.resolvedLanguage?.toUpperCase()}
            </TooltipContent>
          </Tooltip>
          {/* modal={false}：避免 Radix 模态层给 body 加 data-scroll-locked（overflow:hidden + position:relative），
              否则窗口级滚动 + sticky 顶栏会在页面已下滑时把 header 顶出视口（详见滚动容器是 window 而非 body） */}
          <DropdownMenu modal={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <DropdownMenuTrigger className={triggerClass}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('common.more')}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56 lg:w-72">
              <DropdownMenuGroup className="lg:hidden">
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
              <DropdownMenuSeparator className="lg:hidden" />
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('view.groupLabel')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {hasToc && (
                  <DropdownMenuCheckboxItem checked={tocOpen} onCheckedChange={setTocOpen}>
                    {t('toc.outline')}
                    <DropdownMenuShortcut className="max-lg:hidden">
                      <Shortcut keys={['mod', 'alt', 'B']} className="tracking-normal" />
                    </DropdownMenuShortcut>
                  </DropdownMenuCheckboxItem>
                )}
                <DropdownMenuCheckboxItem checked={layout === 'centered'} onCheckedChange={toggleLayout}>
                  {t('common.layoutCentered')}
                  <DropdownMenuShortcut className="max-lg:hidden">
                    <Shortcut keys={['mod', 'alt', 'M']} className="tracking-normal" />
                  </DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
                {t('preview.groupLabel')}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuCheckboxItem
                  checked={previewRendererMode === 'canvas'}
                  onCheckedChange={togglePreviewRendererMode}
                >
                  {t('preview.renderMode')}
                  <DropdownMenuShortcut>{previewRendererMode.toUpperCase()}</DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger inset>{t('preview.animationMode')}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    <DropdownMenuRadioGroup
                      value={previewAnimationMode}
                      onValueChange={value => {
                        if (value === 'system' || value === 'enabled' || value === 'disabled') {
                          setPreviewAnimationMode(value);
                        }
                      }}
                    >
                      <DropdownMenuRadioItem value="system">{t('preview.animationSystem')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="enabled">{t('preview.animationEnabled')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="disabled">{t('preview.animationDisabled')}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger inset>{t('preview.themeMode')}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    <DropdownMenuRadioGroup
                      value={previewThemeMode}
                      onValueChange={value => {
                        if (value === 'inherit' || value === 'light' || value === 'dark') setPreviewThemeMode(value);
                      }}
                    >
                      <DropdownMenuRadioItem value="inherit">{t('preview.themeInherit')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="light">{t('preview.themeLight')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">{t('preview.themeDark')}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuCheckboxItem
                  checked={previewControlPanelDefaultOpen}
                  onCheckedChange={setPreviewControlPanelDefaultOpen}
                >
                  {t('preview.controlPanelDefaultOpen')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={previewHideCode} onCheckedChange={togglePreviewHideCode}>
                  {t('preview.hideAllCode')}
                  <DropdownMenuShortcut className="max-lg:hidden">
                    <Shortcut keys={['mod', 'alt', 'H']} className="tracking-normal" />
                  </DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={previewIsExpand} onCheckedChange={togglePreviewIsExpand}>
                  {t('preview.expandAllCode')}
                  <DropdownMenuShortcut className="max-lg:hidden">
                    <Shortcut keys={['mod', 'alt', 'E']} className="tracking-normal" />
                  </DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={previewDragEnabled} onCheckedChange={togglePreviewDragEnabled}>
                  {t('preview.dragComponent')}
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger inset>{t('comparison.groupLabel')}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {ComparisonTargetList.map(target => (
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
