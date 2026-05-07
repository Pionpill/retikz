import { Menu } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { modules } from '@/data/module';

import { AppSidebar } from '../sidebar/AppSidebar';

/**
 * 移动端 (< lg) 顶栏汉堡按钮 + Sheet 抽屉。
 * 抽屉内：顶部紧凑 module 切换（ToggleGroup，单选）+ 下方完整 sidebar 内容。
 * 路由变化时自动关闭。
 */
export const MobileNav: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { moduleId } = useParams<'moduleId'>();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

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
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">retikz</SheetTitle>
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
        <AppSidebar className="flex h-[calc(100vh-7.5rem)] w-full shrink-0 flex-col overflow-y-auto px-4 py-4" />
      </SheetContent>
    </Sheet>
  );
};
