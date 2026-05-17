import { AlertCircle, Trash2 } from 'lucide-react';
import { type FC, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAiChatStore } from '@/store/useAiChatStore';
import type { ChatErrorKind } from '../providers/types';
import { AiChatConversationEmpty } from './AiChatConversationEmpty';
import { AiChatInput } from './AiChatInput';
import { AiChatMessage } from './AiChatMessage';

const ERROR_KEY = {
  auth: 'ai.errorAuth',
  rate: 'ai.errorRate',
  window: 'ai.errorWindow',
  network: 'ai.errorNetwork',
  unknown: 'ai.errorUnknown',
} as const satisfies Record<ChatErrorKind, string>;

/**
 * 对话视图：消息列表 + 输入区。当前页 / 取消生成 hint 已迁入 AiChatInput，
 * 这里只保留 Clear 按钮和滚动容器
 */
export const AiChatConversation: FC = () => {
  const { t } = useTranslation();
  const messages = useAiChatStore(s => s.messages);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const error = useAiChatStore(s => s.error);
  const clear = useAiChatStore(s => s.clearConversation);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isGenerating]);

  const errorText = error
    ? error.kind === 'unknown'
      ? t('ai.errorUnknown', { message: error.message })
      : t(ERROR_KEY[error.kind])
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-border px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 cursor-pointer gap-1 px-2 text-xs text-muted-foreground"
          onClick={clear}
          disabled={messages.length === 0 || isGenerating}
        >
          <Trash2 className="size-3" />
          {t('ai.convClearLabel')}
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !error ? (
          <AiChatConversationEmpty />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => {
              const isLast = idx === messages.length - 1;
              const isStreamingThis = isGenerating && isLast && m.role === 'assistant';
              // 最新条助手消息且不在流式中：动作条常驻
              const isSettledLastAssistant = !isGenerating && isLast && m.role === 'assistant';
              return (
                <AiChatMessage
                  key={idx}
                  message={m}
                  isStreaming={isStreamingThis}
                  alwaysShowActions={isSettledLastAssistant}
                />
              );
            })}
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
    </div>
  );
};
