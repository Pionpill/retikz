import type { FC } from 'react';

import { DocsSearch } from '@/components/shared/docs-search';

import { MobileNav } from '../mobile/MobileNav';

import { BrandLink } from './BrandLink';
import { HeaderActions } from './HeaderActions';
import { ModuleNav } from './ModuleNav';

/**
 * 文档站顶栏：sticky 全宽，左到右五块——
 * 移动端汉堡（仅 < lg） / brand / 模块切换 nav（仅 lg+） / 搜索（始终）/ 右侧动作组（仅 lg+）。
 * 移动端只剩汉堡 + brand + 搜索 icon；其它工具进抽屉。
 */
const AppHeader: FC = () => (
  <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:gap-6 lg:px-6">
    <MobileNav />
    <BrandLink />
    <ModuleNav />
    <DocsSearch className="ml-auto lg:ml-0" />
    <HeaderActions />
  </header>
);

export default AppHeader;
