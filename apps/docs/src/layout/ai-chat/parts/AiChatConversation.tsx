import { AlertCircle, FileText, Trash2 } from 'lucide-react';
import { type FC, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAiChatStore } from '@/store/useAiChatStore';
import type { ChatErrorKind } from '../providers/types';
import { AiChatInput } from './AiChatInput';
import { AiChatMessage } from './AiChatMessage';

const ERROR_KEY = {
  auth: 'ai.errorAuth',
  rate: 'ai.errorRate',
  window: 'ai.errorWindow',
  network: 'ai.errorNetwork',
  unknown: 'ai.errorUnknown',
} as const satisfies Record<ChatErrorKind, string>;

export const AiChatConversation: FC = () => {
  const { t } = useTranslation();
  const messages = useAiChatStore(s => s.messages);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const error = useAiChatStore(s => s.error);
  const currentPage = useAiChatStore(s => s.currentPage);
  const clear = useAiChatStore(s => s.clearConversation);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 流式追加 / 新消息时自动滚到底；不影响用户手动上拉浏览历史的体验
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isGenerating]);

  const footHint =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
      ? t('ai.convFootHint')
      : t('ai.convFootHintWin');

  const errorText = error
    ? error.kind === 'unknown'
      ? t('ai.errorUnknown', { message: error.message })
      : t(ERROR_KEY[error.kind])
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Top context chip */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <FileText className="size-3" />
          <span className="max-w-[200px] truncate">{currentPage?.title ?? t('ai.convNoPageContext')}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 cursor-pointer gap-1 px-2 text-xs text-muted-foreground"
          onClick={clear}
          disabled={messages.length === 0 || isGenerating}
        >
          <Trash2 className="size-3" />
          {t('ai.convClearLabel')}
        </Button>
      </div>

      {/* Messages scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !error ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {t('ai.convEmptyHint')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => (
              <AiChatMessage
                key={idx}
                message={m}
                isStreaming={isGenerating && idx === messages.length - 1 && m.role === 'assistant'}
              />
            ))}
            {errorText && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <AiChatInput />

      <div className="px-3 pb-2 text-center text-[10px] text-muted-foreground">{footHint}</div>
    </div>
  );
};
