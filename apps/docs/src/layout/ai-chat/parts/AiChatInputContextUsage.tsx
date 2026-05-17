import { Bot } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { FALLBACK_CONTEXT_LIMIT, MODEL_CONTEXT_LIMIT } from '../models';

const CIRCLE_RADIUS = 4.5;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

/**
 * Toolbar 右侧的上下文用量圆环 + 百分比
 * @description 点击展开 popover 显示 input/output/cacheRead 细分 + 底部 Compress 按钮；
 *   超 80% 时圆环 + 百分比切 amber 警示色
 */
export const AiChatInputContextUsage: FC = () => {
  const { t } = useTranslation();
  const providerId = useAiChatStore(s => s.providerId);
  const model = useAiChatStore(s => s.models[providerId]);
  const usage = useAiChatStore(s => s.usage);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const messagesLength = useAiChatStore(s => s.messages.length);
  const compressConversation = useAiChatStore(s => s.compressConversation);

  const [open, setOpen] = useState(false);

  const { percent, used, max, maxRaw } = useMemo(() => {
    const usedTokens = usage.input + usage.output;
    const knownLimit = (MODEL_CONTEXT_LIMIT as Record<string, number | undefined>)[model];
    const maxTokens = knownLimit ?? FALLBACK_CONTEXT_LIMIT;
    const ratio = maxTokens > 0 ? Math.min(1, usedTokens / maxTokens) : 0;
    return {
      percent: Math.round(ratio * 100),
      used: Math.round(usedTokens / 1000),
      max: Math.round(maxTokens / 1000),
      maxRaw: maxTokens,
    };
  }, [usage, model]);

  const dashOffset = CIRCUMFERENCE * (1 - percent / 100);
  const warn = percent >= 80;
  const compressDisabled = isGenerating || messagesLength === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-[10px] hover:bg-accent hover:text-foreground',
          warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        )}
        aria-label={t('ai.convContextTitle')}
        title={t('ai.convContextUsage', { used, max, percent })}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <circle cx="6" cy="6" r={CIRCLE_RADIUS} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          <circle
            cx="6"
            cy="6"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 6 6)"
          />
        </svg>
        <span>{percent}%</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-0">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{t('ai.convContextTitle')}</span>
            <span className={cn('font-mono text-[11px]', warn && 'text-amber-600 dark:text-amber-400')}>
              {t('ai.convContextUsage', { used, max, percent })}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full', warn ? 'bg-amber-500' : 'bg-foreground/60')}
              style={{ width: `${percent}%` }}
            />
          </div>
          <ul className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
            <li className="flex justify-between">
              <span>{t('ai.convContextInput')}</span>
              <span className="font-mono">{usage.input.toLocaleString()}</span>
            </li>
            <li className="flex justify-between">
              <span>{t('ai.convContextOutput')}</span>
              <span className="font-mono">{usage.output.toLocaleString()}</span>
            </li>
            {usage.cacheRead > 0 && (
              <li className="flex justify-between">
                <span>{t('ai.convContextCacheRead')}</span>
                <span className="font-mono">{usage.cacheRead.toLocaleString()}</span>
              </li>
            )}
            <li className="mt-1 flex justify-between border-t border-border pt-1">
              <span>Window</span>
              <span className="font-mono">{maxRaw.toLocaleString()}</span>
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            void compressConversation();
          }}
          disabled={compressDisabled}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Bot className="size-3" />
          <span>{isGenerating ? t('ai.convCompressing') : t('ai.convCompress')}</span>
        </button>
      </PopoverContent>
    </Popover>
  );
};
