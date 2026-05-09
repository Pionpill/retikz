import { Menu } from 'lucide-react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { modules } from '@/data/module';

import { AppSidebar } from '../DocLayout/sidebar/AppSidebar';

/**
 * 移动端 (< lg) 顶栏左侧汉堡按钮 + Sheet 抽屉。
 * 抽屉内：
 *   1. SheetHeader：复用桌面 BrandLink 的"标题 + 版本徽章" + 模块 ToggleGroup
 *   2. AppSidebar：当前模块下完整的栏目 / 页面树
 *
 * 注意：本组件挂在 AppHeader 里，渲染位置在 `<Routes>` 之外，所以 useParams() 取不到 :moduleId。
 * 因此 moduleId 这里直接从 pathname 解析（首段），并验证是否在 modules 注册表里；
 * 解析后的 id 同时用于 ToggleGroup 选中态和 AppSidebar 的列表渲染。
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
              <span className="text-base font-semibold tracking-tight">ReTikz.doc</span>
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
