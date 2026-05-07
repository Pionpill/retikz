import type { FC } from 'react';

import { MobileNav } from '../mobile/MobileNav';

import { BrandLink } from './BrandLink';
import { HeaderActions } from './HeaderActions';
import { ModuleNav } from './ModuleNav';

/**
 * 文档站顶栏：sticky 全宽，左到右四块——
 * 移动端汉堡（仅 < lg） / brand / 模块切换 nav / 右侧动作组。
 */
const AppHeader: FC = () => (
  <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:gap-6 lg:px-6">
    <MobileNav />
    <BrandLink />
    <ModuleNav />
    <HeaderActions />
  </header>
);

export default AppHeader;
