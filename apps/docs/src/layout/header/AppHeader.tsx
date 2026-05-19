import { type FC, useEffect, useRef, useState } from 'react';

import { DocsSearch } from '@/components/shared/docs-search';

import { AiChatTrigger } from '../ai-chat';
import { MobileNav } from '../mobile/MobileNav';

import { BrandLink } from './BrandLink';
import { HeaderActions } from './HeaderActions';
import { ModuleNav } from './ModuleNav';
import { HeaderCompactContext } from './useHeaderCompact';

/** 紧凑模式像素阈值；与 Tailwind 命名断点 `@4xl/header:` (56rem) 对齐 */
const COMPACT_THRESHOLD_PX = 896;

/**
 * 文档站顶栏（sticky 全宽）
 * @description 三段式：左 = 汉堡 / brand / 模块切换；中 = 搜索 + AI 触发；右 = HeaderActions
 *   响应式按 **header 自身宽度** 切换（容器查询 `@container/header`），不再吃 viewport：
 *   AI 面板打开后 header 实宽变小可正确折叠成紧凑布局。
 *
 *   阈值映射：`@xs/header:` (320px) BrandLink 版本徽章；`@2xl/header:` (672px) 右段三段平衡；
 *   `@4xl/header:` (896px) 完整桌面 chrome（ModuleNav / 平铺 action / Shortcut 徽章）
 *
 *   `DropdownMenuContent` 走 Radix Portal，容器查询过不去——`<HeaderCompactContext.Provider>`
 *   注入 `compact: boolean`，portal 子树用 `useHeaderCompact()` 读取后条件渲染
 */
const AppHeader: FC = () => {
  const ref = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      // Tailwind 容器查询走 border-box；与 CSS 保持一致避免边界值附近 portal 与 in-tree 状态错位
      const width =
        entry.borderBoxSize.length > 0
          ? entry.borderBoxSize[0].inlineSize
          : entry.contentRect.width;
      setCompact(width < COMPACT_THRESHOLD_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <HeaderCompactContext.Provider value={compact}>
      <header
        ref={ref}
        className="@container/header sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur @4xl/header:gap-6 @4xl/header:px-6"
      >
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-3 @4xl/header:gap-6">
          <MobileNav />
          <BrandLink />
          <ModuleNav />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DocsSearch />
          <AiChatTrigger />
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 @2xl/header:flex-1 @2xl/header:basis-0 @4xl/header:gap-3">
          <HeaderActions />
        </div>
      </header>
    </HeaderCompactContext.Provider>
  );
};

export default AppHeader;
