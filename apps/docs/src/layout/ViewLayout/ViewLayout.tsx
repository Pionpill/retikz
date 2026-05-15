import { type FC, useEffect, useState } from 'react';
import { Outlet } from 'react-router';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AiChatPanel } from '@/layout/ai-chat';
import { useAiChatStore } from '@/store/useAiChatStore';

import AppHeader from '../header/AppHeader';

/** AI 面板像素范围：MIN 保住表单/按钮的最低可读宽度，MAX 由产品定 */
const MIN_AI_PX = 320;
const MAX_AI_PX = 800;
const DEFAULT_AI_PX = 384;
/** 桌面断点（lg）；窄于此 viewport 不渲染 AI 面板（与 AiChatTrigger 的 lg-only 显示一致） */
const DESKTOP_BREAKPOINT = 1024;

const useViewportWidth = (): number => {
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  useEffect(() => {
    const handler = () => setVw(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return vw;
};

/**
 * 根布局：主内容 + 可拖拽 AI 面板
 * @description 用 shadcn `ResizablePanelGroup` 托管拖拽 UX。库只认百分比，所以把
 *   MIN/MAX/DEFAULT_AI_PX 按当前 viewport 宽度换算成 % 喂进去；viewport 变化时
 *   useViewportWidth 触发重算，库内部 clamp 会把超界宽度收回。
 *
 *   AI 面板按 store.open + viewport ≥ lg 条件挂载；关闭即卸载，handle 一并消失。
 *   autoSaveId 让库把用户拖到的宽度记进 localStorage，刷新后还原。
 */
export const ViewLayout: FC = () => {
  const open = useAiChatStore(s => s.open);
  const vw = useViewportWidth();
  const aiOpen = open && vw >= DESKTOP_BREAKPOINT;

  const toPercent = (px: number): number => Math.min(95, (px / vw) * 100);

  return (
    <ResizablePanelGroup direction="horizontal" autoSaveId="docs-view" className="min-h-screen">
      <ResizablePanel order={1} className="!overflow-visible">
        <div className="flex min-h-screen min-w-0 flex-col">
          <AppHeader />
          <Outlet />
        </div>
      </ResizablePanel>
      {aiOpen && (
        <>
          <ResizableHandle className="data-[resize-handle-state=hover]:bg-primary/40 data-[resize-handle-state=drag]:bg-primary" />
          <ResizablePanel
            order={2}
            defaultSize={toPercent(DEFAULT_AI_PX)}
            minSize={toPercent(MIN_AI_PX)}
            maxSize={toPercent(MAX_AI_PX)}
            className="!overflow-visible"
          >
            <AiChatPanel />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
};
