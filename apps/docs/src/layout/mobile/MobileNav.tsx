import { Menu } from 'lucide-react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { modules } from '@/data/module';

import { AppSidebar } from '../doc-layout/sidebar/AppSidebar';

/**
 * 移动端汉堡按钮 + Sheet 抽屉
 * @description 抽屉内 SheetHeader（brand + 模块 ToggleGroup） + AppSidebar；挂在 AppHeader 里位置在 `<Routes>` 外，moduleId 直接从 pathname 首段解析
 */
export const MobileNav: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const moduleId = useMemo(() => {
    const first = pathname.split('/').filter(Boolean)[0];
    return modules.some(m => m.id === first) ? first : modules[0]?.id;
  }, [pathname]);

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
      <SheetContent side="left" className="w-80 p-0 flex flex-col gap-0">
        <SheetHeader className="border-b px-4 py-3 shrink-0 gap-2">
          <SheetTitle asChild>
            <Link
              to="/"
              className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
              aria-label="retikz home"
            >
              <span className="text-base font-semibold tracking-tight">ReTikZ.doc</span>
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground font-normal">
                {t('common.versionTag')}
              </span>
            </Link>
          </SheetTitle>
          <ToggleGroup
            type="single"
            value={moduleId}
            onValueChange={value => {
              if (value) navigate(`/${value}`);
            }}
          >
            {modules.map(m => (
              <ToggleGroupItem key={m.id} value={m.id} className="flex-1 text-xs">
                {t(m.label)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SheetHeader>
        <AppSidebar className="flex-1 min-h-0 w-full shrink-0" moduleId={moduleId} />
      </SheetContent>
    </Sheet>
  );
};
