import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { AiChatPanel } from '@/layout/ai-chat';
import { useAiChatStore } from '@/store/use-ai-chat-store';

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
 * 根布局：主内容 + AI 面板（桌面侧栏 / 移动底部 Drawer）
 * @description 桌面（≥ lg）用 shadcn `ResizablePanelGroup` 托管拖拽侧栏；库只认百分比，
 *   按 viewport 把 MIN/MAX/DEFAULT_AI_PX 换算成 % 喂进去，viewport 变化由 useViewportWidth
 *   触发重算，库内 clamp 收回超界宽度。autoSaveId 把用户拖到的宽度存 localStorage。
 *
 *   移动（< lg）用 bottom Sheet 全高（h-dvh）弹出，与桌面共用 store.open 与 AiChatPanel 内容；
 *   生成中 Esc 由 AiChatPanel 自身的窗口监听负责 abort，这里阻止 Sheet 关闭以免抢键。
 */
export const ViewLayout: FC = () => {
  const { t } = useTranslation();
  const open = useAiChatStore(s => s.open);
  const setOpen = useAiChatStore(s => s.setOpen);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const vw = useViewportWidth();
  const isDesktop = vw >= DESKTOP_BREAKPOINT;
  const aiOpenDesktop = open && isDesktop;
  const aiOpenMobile = open && !isDesktop;

  const toPercent = (px: number): number => Math.min(95, (px / vw) * 100);

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="docs-view"
        className="min-h-screen overflow-x-clip! overflow-y-visible!"
      >
        <ResizablePanel order={1} className="overflow-x-clip! overflow-y-visible!">
          <div className="flex min-h-screen min-w-0 flex-col">
            <AppHeader />
            <Outlet />
          </div>
        </ResizablePanel>
        {aiOpenDesktop && (
          <>
            <ResizableHandle />
            <ResizablePanel
              order={2}
              defaultSize={toPercent(DEFAULT_AI_PX)}
              minSize={toPercent(MIN_AI_PX)}
              maxSize={toPercent(MAX_AI_PX)}
              // 三件套：
              // 1) overflow-x-clip 截横向溢出（clip 不像 hidden 那样创 scroll container，保留 sticky 的 viewport 锚定）
              // 2) overflow-y-visible 让内部 sticky 看得到顶层文档滚动
              // 3) min-w-0! 直接强制 flex item 最小宽 = 0，杜绝长代码行 / 大 SVG 的 min-content propagate 撑大 panel
              //    （`overflow-x-clip` 单独不一定能触发 flex 的隐式 min-width:auto→0 规则，必须显式加）
              className="overflow-x-clip! overflow-y-visible! min-w-0!"
            >
              <div className="sticky top-0 h-screen min-w-0 max-w-full">
                <AiChatPanel />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {!isDesktop && (
        <Sheet open={aiOpenMobile} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="h-dvh gap-0 p-0"
            onEscapeKeyDown={e => {
              // 生成中 Esc 让 AiChatPanel 的全局 keydown 自己 abort，不让 Sheet 抢去关闭
              if (isGenerating) e.preventDefault();
            }}
          >
            <SheetTitle className="sr-only">{t('ai.triggerLabel')}</SheetTitle>
            <SheetDescription className="sr-only">{t('ai.triggerHint')}</SheetDescription>
            <AiChatPanel />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
