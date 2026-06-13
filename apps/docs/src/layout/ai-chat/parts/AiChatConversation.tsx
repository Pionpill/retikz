import { AlertCircle } from 'lucide-react';
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStickToBottom } from 'use-stick-to-bottom';

import { useAiChatStore } from '@/store/use-ai-chat-store';
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
  const activeConversationId = useAiChatStore(s => s.activeConversationId);

  // 贴底跟随：流式新增内容时若用户已在底部则自动滚动；用户手动上滑后停止跟随，
  // 滑回底部附近恢复。ResizeObserver 也会处理消息体尺寸变化导致的滚动跳变。
  const { scrollRef, contentRef, scrollToBottom } = useStickToBottom();

  // 切会话直接跳底（新会话独立于上一会话的滚动状态）
  useEffect(() => {
    scrollToBottom({ animation: 'instant' });
  }, [activeConversationId, scrollToBottom]);

  const errorText = error
    ? error.kind === 'unknown'
      ? t('ai.errorUnknown', { message: error.message })
      : t(ERROR_KEY[error.kind])
    : null;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div ref={contentRef} className="flex min-h-full flex-col">
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
      </div>

      <AiChatInput />
    </div>
  );
};
