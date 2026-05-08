import { AlignCenter, Columns3, Languages, Link as LinkIcon, Moon, Sun, TableOfContents } from 'lucide-react';
import { type FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { GitHubIcon } from '@/components/icons';
import { DocsSearch } from '@/components/shared/docs-search';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LANGS, type Lang } from '@/i18n';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useTocStore } from '@/store/useTocStore';

// TooltipTrigger 默认即 <button>，直接套 buttonVariants；不再用 <Button asChild> 包，
// 避免 React 18 下 asChild → 自定义函数组件 ref 转发不到，触发不到 Popper 锚点。
const triggerClass = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 cursor-pointer rounded-sm');

/**
 * 顶栏右侧动作组：主题 / 语言 / GitHub | 复制链接 / 切 TOC。
 * 全部走 ghost icon button + Tooltip；TooltipProvider 在本组件内部自闭包，
 * AppHeader 不必感知 Tooltip 实现。
 */
export const HeaderActions: FC = () => {
  const { t, i18n } = useTranslation();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);
  const layout = useLayoutStore(s => s.layout);
  const toggleLayout = useLayoutStore(s => s.toggleLayout);

  const ThemeIcon = theme === 'light' ? Sun : Moon;
  const themeLabel = theme === 'light' ? t('common.themeLight') : t('common.themeDark');
  const LayoutIcon = layout === 'default' ? Columns3 : AlignCenter;
  const layoutLabel = layout === 'default' ? t('common.layoutDefault') : t('common.layoutCentered');

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success(t('toc.linkCopied'));
  }, [t]);

  const handleToggleToc = useCallback(() => {
    setTocOpen(!tocOpen);
  }, [tocOpen, setTocOpen]);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const handleCycleLang = useCallback(() => {
    const idx = LANGS.indexOf(i18n.resolvedLanguage as Lang);
    const next = LANGS[(idx + 1) % LANGS.length];
    void i18n.changeLanguage(next);
  }, [i18n]);

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
              <a href="https://github.com/Pionpill/retikz" target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{t('common.github')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className={triggerClass} onClick={handleCopyLink}>
              <LinkIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{t('toc.copyLink')} (Ctrl+L)</TooltipContent>
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
        </div>
        <Separator orientation="vertical" className="h-4!" />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger className={triggerClass} onClick={handleToggleToc}>
              <TableOfContents className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{tocOpen ? t('toc.hideOutline') : t('toc.showOutline')} (Ctrl+Alt+B)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className={triggerClass} onClick={toggleLayout}>
              <LayoutIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{layoutLabel}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
