import type { FC } from 'react';

import { DocsSearch } from '@/components/shared/docs-search';

import { MobileNav } from '../mobile/MobileNav';

import { BrandLink } from './BrandLink';
import { HeaderActions } from './HeaderActions';
import { ModuleNav } from './ModuleNav';

/**
 * 文档站顶栏（sticky 全宽）
 * @description 左侧：移动端汉堡 / brand / 模块切换 nav；右侧：搜索 + AI Ask + 动作组（桌面图标平铺，移动端折进 ⋯ Dropdown）
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
