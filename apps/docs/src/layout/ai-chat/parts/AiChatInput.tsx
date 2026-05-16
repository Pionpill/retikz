import { Send } from 'lucide-react';
import { type FC, type KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAiChatStore } from '@/store/useAiChatStore';

import { AiChatInputContextChips } from './AiChatInputContextChips';
import { AiChatInputContextModePicker } from './AiChatInputContextModePicker';
import { AiChatInputMetaRow } from './AiChatInputMetaRow';
import { AiChatInputModelPicker } from './AiChatInputModelPicker';

/** textarea 最大高度（约 3 行 leading-relaxed 文本） */
const MAX_TEXTAREA_HEIGHT = 72;

/**
 * AI Chat 输入框（Copilot 风格三段式）
 * @description prompt 框 bg-muted 区分：① chips 行 ② textarea（1 行起、3 行封顶滚动）
 *   ③ pickers + ghost Send。下方 meta 行：Esc 提示 + 上下文圆环。
 *   draft / focusInputNonce 来自 store，让空态 suggestion 可写入并聚焦
 */
export const AiChatInput: FC = () => {
  const { t } = useTranslation();
  const send = useAiChatStore(s => s.send);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const draft = useAiChatStore(s => s.draft);
  const setDraft = useAiChatStore(s => s.setDraft);
  const focusInputNonce = useAiChatStore(s => s.focusInputNonce);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 自适应行高 —— 1 行起、最高 3 行，超出后内部滚动；滚动条按项目约定隐藏
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [draft]);

  // 外部触发 focus（suggestion 点击等场景）：focusInputNonce 变化即聚焦并把光标置末尾
  useEffect(() => {
    if (focusInputNonce === 0) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [focusInputNonce]);

  const handleSubmit = useCallback(() => {
    if (isGenerating) return;
    const value = draft.trim();
    if (!value) return;
    setDraft('');
    void send(value);
  }, [isGenerating, send, draft, setDraft]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const sendDisabled = isGenerating || draft.trim().length === 0;

  return (
    <div className="border-t border-border bg-background px-3 pt-2 pb-3">
      <div className="flex flex-col rounded-lg border border-border bg-muted">
        <AiChatInputContextChips />

        <div className="px-3 pb-1">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.convPlaceholder')}
            rows={1}
            className="block w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            style={{ maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <div className="flex items-center gap-1">
            <AiChatInputModelPicker />
            <AiChatInputContextModePicker />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 cursor-pointer rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            onClick={handleSubmit}
            aria-label={t('ai.convSend')}
            disabled={sendDisabled}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      <AiChatInputMetaRow />
    </div>
  );
};
