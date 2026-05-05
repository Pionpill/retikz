import { GitHubIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LANGS, type Lang } from '@/i18n';
import { useThemeStore } from '@/store/useThemeStore';
import { useTocStore } from '@/store/useTocStore';
import { Languages, Link as LinkIcon, Moon, Sun, TableOfContents } from 'lucide-react';
import { type FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const buttonClass = 'size-7 cursor-pointer rounded-sm';

const AppHeader: FC = () => {
  const { t, i18n } = useTranslation();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);

  const ThemeIcon = theme === 'light' ? Sun : Moon;
  const themeLabel = theme === 'light' ? t('common.themeLight') : t('common.themeDark');

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
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <TooltipProvider delayDuration={150}>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className={buttonClass} onClick={handleToggleTheme}>
                  <ThemeIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{themeLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className={buttonClass} onClick={handleCycleLang}>
                  <Languages className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('common.switchLanguage')} · {i18n.resolvedLanguage?.toUpperCase()}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon" variant="ghost" className={buttonClass}>
                  <a href="https://github.com/Pionpill/retikz" target="_blank" rel="noopener noreferrer">
                    <GitHubIcon className="size-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('common.github')}</TooltipContent>
            </Tooltip>
          </div>
          <Separator orientation="vertical" className="h-4!" />
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className={buttonClass} onClick={handleCopyLink}>
                  <LinkIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('toc.copyLink')} (Ctrl+L)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className={buttonClass} onClick={handleToggleToc}>
                  <TableOfContents className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tocOpen ? t('toc.hideOutline') : t('toc.showOutline')} (Ctrl+Alt+B)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    </header>
  );
};

export default AppHeader;
