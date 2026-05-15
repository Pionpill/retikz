import type { FC } from 'react';

import { DocsSearch } from '@/components/shared/docs-search';

import { AiChatTrigger } from '../ai-chat';
import { MobileNav } from '../mobile/MobileNav';

import { BrandLink } from './BrandLink';
import { HeaderActions } from './HeaderActions';
import { ModuleNav } from './ModuleNav';

/**
 * 文档站顶栏（sticky 全宽）
 * @description 三段式：左 = 汉堡 / brand / 模块切换；中 = 搜索 + AI 触发；右 = HeaderActions（GitHub / 复制链接 / 主题 / 语言 / 更多）
 *   左右两侧用 `flex-1 basis-0` 等分，中间组件保持自身宽度，搜索栏稳定居中不被 Module 切换标签拉偏
 */
const AppHeader: FC = () => (
  <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:gap-6 lg:px-6">
    <div className="flex min-w-0 flex-1 basis-0 items-center gap-3 lg:gap-6">
      <MobileNav />
      <BrandLink />
      <ModuleNav />
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <DocsSearch />
      <AiChatTrigger />
    </div>
    <div className="flex min-w-0 flex-1 basis-0 items-center justify-end gap-2 lg:gap-3">
      <HeaderActions />
    </div>
  </header>
);

export default AppHeader;
