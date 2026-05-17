import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { type FC, type KeyboardEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import type { Conversation } from '../conversationsStorage';

/**
 * AI 历史会话列表视图
 * @description view==='history' 时渲染。顶栏返回 / 新建；中间列表按 updatedAt 倒序。
 *   每行：标题（空 → "未命名对话" 兜底）+ 相对时间 + 消息数；当前 active 高亮 + "当前"徽标。
 *   右键 / 长按行弹 ContextMenu：Rename / Delete。Rename 走 inline edit（Enter 提交 / Esc 取消 / blur 提交）。
 *   Delete 走 window.confirm 一道防误删；hydration 未完成时显示骨架
 */
export const AiChatHistory: FC = () => {
  const { t, i18n } = useTranslation();
  const setView = useAiChatStore(s => s.setView);
  const hydrated = useAiChatStore(s => s.conversationsHydrated);
  const conversations = useAiChatStore(s => s.conversations);
  const activeId = useAiChatStore(s => s.activeConversationId);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const switchConversation = useAiChatStore(s => s.switchConversation);
  const deleteConversation = useAiChatStore(s => s.deleteConversation);
  const renameConversation = useAiChatStore(s => s.renameConversation);

  const sorted = useMemo(
    () => Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  const handleBack = () => setView('main');

  const handleNewChat = () => {
    if (isGenerating) return;
    switchConversation('');
    setView('main');
  };

  const handleSwitch = (id: string) => {
    if (isGenerating) return;
    if (editingId === id) return;
    switchConversation(id);
    setView('main');
  };

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingDraft(conv.title || displayTitle(conv));
  };

  const commitRename = () => {
    if (editingId === null) return;
    const trimmed = editingDraft.trim();
    if (trimmed) renameConversation(editingId, trimmed);
    setEditingId(null);
    setEditingDraft('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingDraft('');
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  const handleDelete = (conv: Conversation) => {
    const confirmed = window.confirm(t('ai.historyDeleteConfirm'));
    if (!confirmed) return;
    void deleteConversation(conv.id);
  };

  const displayTitle = (conv: Conversation): string =>
    conv.title.trim() || t('ai.historyUntitledLabel');

  const formatRelative = (timestamp: number): string => formatRelativeTime(timestamp, i18n.language);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 cursor-pointer rounded-sm"
          onClick={handleBack}
          aria-label={t('ai.back')}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">{t('ai.historyLabel')}</span>
        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5"
            onClick={handleNewChat}
            disabled={isGenerating}
          >
            <Plus className="size-3.5" />
            {t('ai.historyNewChatLabel')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hydrated && (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {hydrated && sorted.length === 0 && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {t('ai.historyEmptyLabel')}
          </div>
        )}
        {hydrated && sorted.length > 0 && (
          <ul className="flex flex-col">
            {sorted.map(conv => {
              const isActive = conv.id === activeId;
              const isEditing = conv.id === editingId;
              const messageCount = conv.messages.length;
              return (
                <li key={conv.id}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div
                        role="button"
                        tabIndex={isEditing ? -1 : 0}
                        onClick={() => !isEditing && handleSwitch(conv.id)}
                        onKeyDown={e => {
                          if (isEditing) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSwitch(conv.id);
                          }
                        }}
                        className={cn(
                          'flex w-full cursor-pointer flex-col gap-0.5 border-b border-border px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                          isActive && 'bg-muted/40',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingDraft}
                              onChange={e => setEditingDraft(e.target.value)}
                              onKeyDown={handleRenameKeyDown}
                              onBlur={commitRename}
                              onClick={e => e.stopPropagation()}
                              className="min-w-0 flex-1 rounded-sm border border-border bg-background px-1.5 py-0.5 text-sm outline-none focus:border-primary"
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {displayTitle(conv)}
                            </span>
                          )}
                          {isActive && !isEditing && (
                            <span className="shrink-0 rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {t('ai.historyActiveBadge')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatRelative(conv.updatedAt)}</span>
                          <span>·</span>
                          <span>{t('ai.historyMessageCountLabel', { count: messageCount })}</span>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onSelect={() => handleStartRename(conv)}>
                        {t('ai.historyRenameLabel')}
                      </ContextMenuItem>
                      <ContextMenuItem variant="destructive" onSelect={() => handleDelete(conv)}>
                        <Trash2 />
                        {t('ai.historyDeleteLabel')}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

/**
 * 简版相对时间格式化：< 1m / Xm / Xh / Xd / 绝对日期
 * @description 不引第三方库；Intl.RelativeTimeFormat 与 toLocaleDateString 走系统 locale；
 *   一周内显示相对，更老的转 yyyy-mm-dd 形式
 */
const formatRelativeTime = (timestamp: number, locale: string): string => {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return rtf.format(-diffDay, 'day');
  return new Date(timestamp).toLocaleDateString(locale);
};
