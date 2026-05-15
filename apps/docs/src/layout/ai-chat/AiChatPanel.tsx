import { Settings, X } from 'lucide-react';
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { AiChatConversation } from './parts/AiChatConversation';
import { AiChatEmpty } from './parts/AiChatEmpty';
import { AiChatSettings } from './parts/AiChatSettings';

/**
 * AI 聊天侧栏 panel
 * @description 与 DocLayout 主区并列的持久 right rail（**非** Sheet 覆盖型），打开时挤压
 *   主内容、不遮挡阅读。挂在 App.tsx 顶层、与 Routes 同行。
 *
 *   关闭时 width 收为 0、aria-hidden=true、children 保留挂载以保持会话 state。
 *   Esc：生成中 abort；非生成中 close。视图路由：view==='settings' → Settings；
 *   否则按当前 provider 是否填 key 选 Empty / Conversation。
 */
export const AiChatPanel: FC = () => {
  const { t } = useTranslation();
  const open = useAiChatStore(s => s.open);
  const setOpen = useAiChatStore(s => s.setOpen);
  const view = useAiChatStore(s => s.view);
  const setView = useAiChatStore(s => s.setView);
  const providerId = useAiChatStore(s => s.providerId);
  const hasKey = useAiChatStore(s => s.apiKeys[providerId].length > 0);
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
    <aside
      aria-hidden={!open}
      className={cn(
        'sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 overflow-hidden border-l border-border bg-background transition-[width,opacity] duration-300 ease-out lg:flex',
        open ? 'w-96 opacity-100' : 'pointer-events-none w-0 opacity-0',
      )}
    >
      <div className="flex h-full w-96 flex-col">
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
      </div>
    </aside>
  );
};
