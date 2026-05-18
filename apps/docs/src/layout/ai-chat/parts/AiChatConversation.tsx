import { AlertCircle } from 'lucide-react';
import { type FC, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
 * 对话视图：消息列表 + 输入区
 * @description 子顶栏已收掉 —— 会话标题 / 新建会话 全部迁入 AiChatPanel 主顶栏。
 *   这里只剩滚动容器 + 错误 banner + AiChatInput
 */
export const AiChatConversation: FC = () => {
  const { t } = useTranslation();
  const messages = useAiChatStore(s => s.messages);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const error = useAiChatStore(s => s.error);

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !error ? (
          <AiChatConversationEmpty />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => (
              <AiChatMessage
                key={idx}
                index={idx}
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
    </div>
  );
};
