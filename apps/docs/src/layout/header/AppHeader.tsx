import type { FC } from 'react';

import { DocsSearch } from '@/components/shared/docs-search';

import { MobileNav } from '../mobile/MobileNav';

import { BrandLink } from './BrandLink';
import { HeaderActions } from './HeaderActions';
import { ModuleNav } from './ModuleNav';

/**
 * 文档站顶栏：sticky 全宽，左到右——
 * 左侧：移动端汉堡（仅 < lg） / brand / 模块切换 nav（仅 lg+）。
 * 右侧：搜索 + 动作组（搜索全断点显示；动作组桌面是一字排开的图标，移动端只剩 ⋯ Dropdown）。
 */
const AppHeader: FC = () => (
  <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:gap-6 lg:px-6">
    <MobileNav />
    <BrandLink />
    <ModuleNav />
    <div className="ml-auto flex items-center gap-2 lg:gap-3">
      <DocsSearch />
      <HeaderActions />
    </div>
  </header>
);

export default AppHeader;
