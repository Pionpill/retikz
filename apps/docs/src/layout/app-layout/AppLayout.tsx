import type { FC } from 'react';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { AiChatPanel, useAiChatStore } from '@/modules/docs/ai-chat';

import AppHeader from '../header/AppHeader';

const MIN_AI_PX = 320;
const MAX_AI_PX = 800;
const DEFAULT_AI_PX = 384;
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

/** 根布局：主内容 + AI 面板。 */
export const AppLayout: FC = () => {
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
