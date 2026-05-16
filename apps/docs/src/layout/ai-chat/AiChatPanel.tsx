import { Settings, X } from 'lucide-react';
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAiChatStore } from '@/store/useAiChatStore';
import { AiChatConversation } from './parts/AiChatConversation';
import { AiChatEmpty } from './parts/AiChatEmpty';
import { AiChatSettings } from './parts/AiChatSettings';

/**
 * AI 聊天侧栏 panel 内容
 * @description 由 ViewLayout 的 `ResizablePanelGroup` 包裹，宽度交给上层 `ResizablePanel`
 *   托管；这里只负责内部布局：sticky h-screen 让面板在主内容滚动时常驻视口。
 *
 *   Esc：生成中 abort；非生成中 close。视图路由：view==='settings' → Settings；
 *   否则按当前 provider 是否填 key 选 Empty / Conversation。
 */
export const AiChatPanel: FC = () => {
  const { t } = useTranslation();
  const open = useAiChatStore(s => s.open);
  const setOpen = useAiChatStore(s => s.setOpen);
  const view = useAiChatStore(s => s.view);
  const setView = useAiChatStore(s => s.setView);
  const hasKey = useAiChatStore(s => {
    const id = s.providerId;
    if (id === 'deepseek' || id === 'openai' || id === 'anthropic') return s.apiKeys[id].length > 0;
    const customProviders = s.customProviders as Record<string, { apiKey: string } | undefined>;
    return (customProviders[id]?.apiKey ?? '').length > 0;
  });
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const abort = useAiChatStore(s => s.abort);

  // 生成中 Esc 优先 abort、非生成中关闭 panel；panel 打开时全局监听
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isGenerating) {
        e.preventDefault();
        abort();
      } else {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isGenerating, abort, setOpen]);

  const showSettings = view === 'settings';
  const showEmpty = !showSettings && !hasKey;
  const showConversation = !showSettings && hasKey;

  return (
    <aside className="sticky top-0 flex h-screen flex-col bg-background">
      {!showSettings && (
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <span className="text-sm font-medium flex items-center gap-2">{t('ai.triggerLabel')}</span>
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
    </aside>
  );
};
