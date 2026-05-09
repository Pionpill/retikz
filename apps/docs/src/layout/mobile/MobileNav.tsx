import { ArrowUpRight, Languages, Link as LinkIcon, Menu, Moon, Sun } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';

import { GitHubIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { modules } from '@/data/module';

import { AppSidebar } from '../DocLayout/sidebar/AppSidebar';
import { GITHUB_URL, TIKZ_DOCS_URL, useDocActions } from '../header/useDocActions';

/** 抽屉内单行工具：左 icon + 标题（+ 副标题），整行可点 */
type ToolRowProps = {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
};

const ToolRow: FC<ToolRowProps> = ({ icon, label, hint, onClick, href, external }) => {
  const inner = (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {external && <ArrowUpRight className="size-3.5 text-muted-foreground" />}
    </>
  );
  const cls = 'flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-muted text-left';
  if (href) {
    return (
      <a className={cls} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
};

/**
 * 移动端 (< lg) 顶栏汉堡按钮 + Sheet 抽屉。
 * 抽屉内：顶部 module 切换 ToggleGroup → 「视图 & 工具」段（主题/语言/复制链接/资源）→ 完整 sidebar。
 * 路由变化时自动关闭。
 */
export const MobileNav: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { moduleId } = useParams<'moduleId'>();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const { theme, handleToggleTheme, currentLang, handleCycleLang, handleCopyLink } = useDocActions();
  const ThemeIcon = theme === 'light' ? Sun : Moon;
  const themeLabel = theme === 'light' ? t('common.themeLight') : t('common.themeDark');

  // 路由变化关闭抽屉：sidebar 内部触发点多（Link / button / Collapsible），统一在路由层闭环
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 cursor-pointer rounded-sm lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3 shrink-0">
          <SheetTitle className="text-sm font-semibold">ReTikz.doc</SheetTitle>
          <ToggleGroup
            type="single"
            value={moduleId ?? 'core'}
            onValueChange={value => {
              if (value) navigate(`/${value}`);
            }}
            className="mt-2"
          >
            {modules.map(m => (
              <ToggleGroupItem key={m.id} value={m.id} className="flex-1 text-xs">
                {t(m.label)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SheetHeader>
        <div className="flex flex-col px-2 py-2 shrink-0">
          <ToolRow
            icon={<ThemeIcon className="size-4" />}
            label={themeLabel}
            onClick={handleToggleTheme}
          />
          <ToolRow
            icon={<Languages className="size-4" />}
            label={t('common.switchLanguage')}
            hint={currentLang?.toUpperCase()}
            onClick={handleCycleLang}
          />
          <ToolRow
            icon={<LinkIcon className="size-4" />}
            label={t('toc.copyLink')}
            onClick={handleCopyLink}
          />
          <Separator className="my-1" />
          <ToolRow
            icon={<GitHubIcon className="size-4" />}
            label={t('common.github')}
            href={GITHUB_URL}
            external
          />
          <ToolRow
            icon={<ArrowUpRight className="size-4" />}
            label={t('common.tikzDocs')}
            href={TIKZ_DOCS_URL}
            external
          />
        </div>
        <Separator className="shrink-0" />
        <AppSidebar className="flex-1 min-h-0 w-full shrink-0" />
      </SheetContent>
    </Sheet>
  );
};
