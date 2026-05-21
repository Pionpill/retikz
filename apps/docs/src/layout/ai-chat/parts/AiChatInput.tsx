import { Send, Square } from 'lucide-react';
import { type FC, type KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAiChatStore } from '@/store/useAiChatStore';

import { AiChatInputAddContextButton } from './AiChatInputAddContextButton';
import { AiChatInputAutoRepairPicker } from './AiChatInputAutoRepairPicker';
import { AiChatInputContextModePicker } from './AiChatInputContextModePicker';
import { AiChatInputContextUsage } from './AiChatInputContextUsage';
import { AiChatInputDiagramFormatPicker } from './AiChatInputDiagramFormatPicker';
import { AiChatInputFooter } from './AiChatInputFooter';
import { AiChatInputHeader } from './AiChatInputHeader';
import { AiChatInputMicButton } from './AiChatInputMicButton';
import { AiChatInputModelPicker } from './AiChatInputModelPicker';
import { AiChatInputPolishButton } from './AiChatInputPolishButton';

/** textarea 最大高度（约 5 行 leading-relaxed 文本） */
const MAX_TEXTAREA_HEIGHT = 120;

/**
 * AI Chat 输入框（v4.2 三段独立）
 * @description Header / Card / Footer 三段：header 与 footer 都在 card 外、无 border、与外层 bg 同色。
 *   card 内：textarea（2 行起、5 行封顶滚动）+ Wand2 润色按钮 + toolbar。
 *   toolbar 左：+ Add Context / 竖分隔 / Model / Context Mode；
 *   toolbar 右：上下文圆环 + % / Mic / ghost Send
 */
export const AiChatInput: FC = () => {
  const { t } = useTranslation();
  const send = useAiChatStore(s => s.send);
  const abort = useAiChatStore(s => s.abort);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const draft = useAiChatStore(s => s.draft);
  const setDraft = useAiChatStore(s => s.setDraft);
  const focusInputNonce = useAiChatStore(s => s.focusInputNonce);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 自适应行高 —— 2 行起、最高 5 行（约 120px），超出后内部滚动；滚动条按项目约定隐藏
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [draft]);

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

  const sendDisabled = draft.trim().length === 0;

  return (
    <div className="flex flex-col gap-1 bg-background px-3 pt-2 pb-3">
      <AiChatInputHeader />

      <div className="flex flex-col rounded-lg border border-border bg-background">
        <div className="relative px-3 pt-2 pb-1">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.convPlaceholder')}
            rows={2}
            className="block w-full resize-none bg-transparent pr-7 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            style={{ maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
          />
          <div className="absolute top-1.5 right-2">
            <AiChatInputPolishButton />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <AiChatInputAddContextButton />
            <span className="mx-1 inline-block h-4 w-px bg-border" />
            <AiChatInputModelPicker />
            <AiChatInputContextModePicker />
            <AiChatInputDiagramFormatPicker />
            <AiChatInputAutoRepairPicker />
          </div>
          <div className="flex items-center gap-1">
            <AiChatInputContextUsage />
            <AiChatInputMicButton />
            {isGenerating ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 cursor-pointer rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={abort}
                aria-label={t('ai.convStop')}
                title={t('ai.convStop')}
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
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
            )}
          </div>
        </div>
      </div>

      <AiChatInputFooter />
    </div>
  );
};
