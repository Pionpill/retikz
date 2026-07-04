import type { FC, KeyboardEvent as ReactKeyboardEvent } from 'react';

import { Bot, HelpCircle, History, Plus, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib';
import { MarkdownInline } from '@/modules/docs/components';

import { AiChatConversation, AiChatEmpty, AiChatHelpDialog, AiChatHistory, AiChatSettings } from './parts';
import { useAiChatStore } from './useAiChatStore';

/** AI 聊天面板内容。 */
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

  useEffect(() => {
    void hydrateConversations();
  }, [hydrateConversations]);

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
  const showMainHeader = !showSettings && !showHistory;
  const showEmpty = showMainHeader && !hasKey;
  const showConversation = showMainHeader && hasKey;

  const titleDisplay =
    activeConversation && activeConversation.title.trim()
      ? activeConversation.title
      : activeConversation
        ? t('ai.historyUntitledLabel')
        : t('ai.triggerLabel');
  const titleEditable = hasKey && !!activeConversationId;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [prevActiveId, setPrevActiveId] = useState(activeConversationId);
  if (prevActiveId !== activeConversationId) {
    setPrevActiveId(activeConversationId);
    setEditing(false);
    setDraft('');
  }

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

  const showNewChatButton = showMainHeader && hasKey;
  const newChatDisabled = isGenerating || messagesLength === 0;

  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <aside className="flex h-full flex-col bg-background">
      {showMainHeader && (
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <Bot className="size-4 shrink-0 text-muted-foreground" aria-hidden />
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
              <MarkdownInline source={titleDisplay} />
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
              onClick={() => setHelpOpen(true)}
              aria-label={t('ai.helpLabel')}
              title={t('ai.helpLabel')}
            >
              <HelpCircle className="size-4" />
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
      <AiChatHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </aside>
  );
};
