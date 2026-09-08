import type { FC } from 'react';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';

import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { resolveDocNavigationContext } from '@/modules/docs/layout';
import { AppSidebar } from '@/modules/docs/layout';

import { HeaderNavigation } from './HeaderNavigation';

/**
 * 移动端汉堡按钮 + Sheet 抽屉
 * @description 首页与 About 页面展示 retikz 模块选择器和完整导航；模块文档展示当前 section 导航与 scoped Sidebar
 */
export const MobileNav: FC = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const navigation = resolveDocNavigationContext(pathname);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={buttonVariants({
          variant: 'ghost',
          size: 'icon',
          className: 'size-7 cursor-pointer rounded-sm lg:hidden',
        })}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 gap-2 border-b px-4 py-3">
          <SheetTitle className="sr-only">Docs navigation</SheetTitle>
          <HeaderNavigation navigation={navigation} mobile onNavigate={close} />
        </SheetHeader>
        {navigation.location && (
          <AppSidebar className="min-h-0 w-full shrink-0 flex-1" location={navigation.location} onNavigate={close} />
        )}
      </SheetContent>
    </Sheet>
  );
};
