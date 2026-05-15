import { Settings, X } from 'lucide-react';
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useAiChatStore } from '@/store/useAiChatStore';
import { AiChatConversation } from './parts/AiChatConversation';
import { AiChatEmpty } from './parts/AiChatEmpty';
import { AiChatSettings } from './parts/AiChatSettings';

/**
 * AI 聊天 Sheet 容器
 * @description 视图路由：view==='settings' 渲染 Settings；否则按当前 provider 是否填 key 选 Empty / Conversation。
 *   Esc：生成中 abort、非生成中关闭（蜜柑 Sheet 默认行为）。
 *   渲染位置：在 <App /> 顶层挂一次即可。
 */
export const AiChatSheet: FC = () => {
  const { t } = useTranslation();
  const open = useAiChatStore(s => s.open);
  const setOpen = useAiChatStore(s => s.setOpen);
  const view = useAiChatStore(s => s.view);
  const setView = useAiChatStore(s => s.setView);
  const providerId = useAiChatStore(s => s.providerId);
  const hasKey = useAiChatStore(s => s.apiKeys[providerId].length > 0);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const abort = useAiChatStore(s => s.abort);

  // 生成中按 Esc 优先 abort 而非关闭 Sheet
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isGenerating) {
        e.preventDefault();
        e.stopPropagation();
        abort();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open, isGenerating, abort]);

  const showSettings = view === 'settings';
  const showEmpty = !showSettings && !hasKey;
  const showConversation = !showSettings && hasKey;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetTitle className="sr-only">{t('ai.triggerLabel')}</SheetTitle>
        <SheetDescription className="sr-only">{t('ai.triggerHint')}</SheetDescription>
        {/* 顶部条：title + 齿轮 + 关闭。settings 视图自带 back，不复用这个条 */}
        {!showSettings && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="text-sm font-medium">✦ {t('ai.triggerLabel')}</span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer rounded-sm"
                onClick={() => setView('settings')}
                aria-label={t('ai.settingsLabel')}
              >
                <Settings className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer rounded-sm"
                onClick={() => setOpen(false)}
                aria-label={t('ai.closeLabel')}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-1 flex-col overflow-hidden">
          {showSettings && <AiChatSettings />}
          {showEmpty && <AiChatEmpty />}
          {showConversation && <AiChatConversation />}
        </div>
      </SheetContent>
    </Sheet>
  );
};
