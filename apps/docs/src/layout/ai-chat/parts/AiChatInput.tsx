import { ArrowUp, Square } from 'lucide-react';
import { type FC, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { PROVIDER_LABEL } from '../models';
import { estimateUsd, formatUsd } from '../pricing';

const MAX_TEXTAREA_HEIGHT = 200;

export const AiChatInput: FC = () => {
  const { t } = useTranslation();
  const send = useAiChatStore(s => s.send);
  const abort = useAiChatStore(s => s.abort);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const providerId = useAiChatStore(s => s.providerId);
  const model = useAiChatStore(s => s.models[providerId]);
  const usage = useAiChatStore(s => s.usage);

  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 自适应行高
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text]);

  const handleSubmit = useCallback(() => {
    if (isGenerating) {
      abort();
      return;
    }
    const value = text.trim();
    if (!value) return;
    setText('');
    void send(value);
  }, [abort, isGenerating, send, text]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const usd = estimateUsd(providerId, model, usage.input, usage.output);

  return (
    <div className="flex flex-col gap-1.5 border-t border-border bg-background px-3 pt-2 pb-3">
      <div className="flex items-end gap-2 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-[3px] focus-within:ring-ring/50">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('ai.convPlaceholder')}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          size="icon"
          variant={isGenerating ? 'destructive' : 'default'}
          className="size-7 shrink-0 cursor-pointer rounded-sm"
          onClick={handleSubmit}
          aria-label={isGenerating ? t('ai.convStop') : t('ai.convSend')}
          disabled={!isGenerating && !text.trim()}
        >
          {isGenerating ? <Square className="size-3.5" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
      <div className={cn('flex items-center justify-between text-[10px] text-muted-foreground')}>
        <span>
          {PROVIDER_LABEL[providerId]} · {model}
        </span>
        <span>
          ↑{formatNumber(usage.input)} · ↓{formatNumber(usage.output)} · ≈{formatUsd(usd)}
        </span>
      </div>
    </div>
  );
};

const formatNumber = (n: number): string => {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}K`;
};
