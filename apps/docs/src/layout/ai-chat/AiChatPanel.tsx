import { History, Plus, Settings, X } from 'lucide-react';
import { type FC, type KeyboardEvent as ReactKeyboardEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { AiChatConversation } from './parts/AiChatConversation';
import { AiChatEmpty } from './parts/AiChatEmpty';
import { AiChatHistory } from './parts/AiChatHistory';
import { AiChatSettings } from './parts/AiChatSettings';

/**
 * AI 聊天面板内容（与容器无关，由调用方决定 sizing context）
 * @description 桌面 ViewLayout 把它放进 ResizablePanel 内的 sticky h-screen aside；
 *   移动 ViewLayout 把它放进 bottom Sheet 的 h-[80vh] 容器。组件本身只负责
 *   内部布局：`flex h-full flex-col`。
 *
 *   单层顶栏：左侧动态会话标题（点击 inline 改名）+ 右侧 [+ New] / History / Settings / X。
 *   Settings / History 自带返回式顶栏，这里隐藏。
 *
 *   Esc：生成中 abort；非生成中关闭 panel。
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
  const hydrateConversations = useAiChatStore(s => s.hydrateConversations);
  const activeConversationId = useAiChatStore(s => s.activeConversationId);
  const activeConversation = useAiChatStore(s =>
    s.activeConversationId ? s.conversations[s.activeConversationId] : undefined,
  );
  const messagesLength = useAiChatStore(s => s.messages.length);
  const renameConversation = useAiChatStore(s => s.renameConversation);
  const clearConversation = useAiChatStore(s => s.clearConversation);

  // panel 渲染挂载即触发一次 IDB 装载（幂等）；history 视图就有数据可显示
  useEffect(() => {
    void hydrateConversations();
  }, [hydrateConversations]);

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
  const showHistory = view === 'history';
  // Settings / History 自带顶栏（带返回按钮），主视图顶栏才出现
  const showMainHeader = !showSettings && !showHistory;
  const showEmpty = showMainHeader && !hasKey;
  const showConversation = showMainHeader && hasKey;

  // 标题：active 会话存在时取其 title（空 → Untitled 兜底）；没有 active 显示品牌 label
  const titleDisplay =
    activeConversation && activeConversation.title.trim()
      ? activeConversation.title
      : activeConversation
        ? t('ai.historyUntitledLabel')
        : t('ai.triggerLabel');
  const titleEditable = hasKey && !!activeConversationId;

  // inline rename：点击标题切到 input；Enter 提交 / Esc 取消 / blur 提交；切换 active 时强制退出编辑
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    setEditing(false);
    setDraft('');
  }, [activeConversationId]);

  const handleStartEdit = () => {
    if (!titleEditable) return;
    setDraft(activeConversation?.title ?? '');
    setEditing(true);
  };
  const commitEdit = () => {
    if (!editing) return;
    const trimmed = draft.trim();
    if (trimmed && activeConversationId) renameConversation(activeConversationId, trimmed);
    setEditing(false);
    setDraft('');
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };
  const handleTitleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  // [+ New chat] 在主视图常驻；生成中或当前会话空时禁用（避免生成空 thread）
  const showNewChatButton = showMainHeader && hasKey;
  const newChatDisabled = isGenerating || messagesLength === 0;

  return (
    <aside className="flex h-full flex-col bg-background">
      {showMainHeader && (
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={commitEdit}
              className="min-w-0 flex-1 rounded-sm border border-border bg-background px-1.5 py-0.5 text-sm font-medium outline-none focus:border-primary"
            />
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              disabled={!titleEditable}
              className={cn(
                'min-w-0 flex-1 truncate text-left text-sm font-medium',
                titleEditable && 'cursor-pointer rounded-sm px-1 py-0.5 hover:bg-accent',
              )}
              title={titleEditable ? t('ai.historyRenameLabel') : undefined}
            >
              {titleDisplay}
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            {showNewChatButton && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer rounded-sm"
                onClick={clearConversation}
                disabled={newChatDisabled}
                aria-label={t('ai.historyNewChatLabel')}
                title={t('ai.historyNewChatLabel')}
              >
                <Plus className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer rounded-sm"
              onClick={() => setView('history')}
              aria-label={t('ai.historyLabel')}
            >
              <History className="size-4" />
            </Button>
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
        {showHistory && <AiChatHistory />}
        {showEmpty && <AiChatEmpty />}
        {showConversation && <AiChatConversation />}
      </div>
    </aside>
  );
};
