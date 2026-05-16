import { Sparkles } from 'lucide-react';
import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { FALLBACK_CONTEXT_LIMIT, MODEL_CONTEXT_LIMIT } from '../models';

const CIRCLE_RADIUS = 4.5;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

/**
 * Prompt 框下方 meta 行
 * @description 左侧 [Esc] kbd + "取消生成" 提示；右侧上下文圆环 + 百分比，
 *   按 MODEL_CONTEXT_LIMIT 估算占比，超 80% 切 warning 色。
 *   点圆环弹 popover：展示 input/output/cacheRead 细分 + 主动压缩按钮
 */
export const AiChatInputMetaRow: FC = () => {
  const { t } = useTranslation();
  const providerId = useAiChatStore(s => s.providerId);
  const model = useAiChatStore(s => s.models[providerId]);
  const usage = useAiChatStore(s => s.usage);
  const isGenerating = useAiChatStore(s => s.isGenerating);
  const messagesLength = useAiChatStore(s => s.messages.length);
  const compressConversation = useAiChatStore(s => s.compressConversation);

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
    <div className="flex items-center justify-between gap-2 px-1 pt-1.5 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Kbd className="h-3.5 px-1 text-[9px]">Esc</Kbd>
        <span>{t('ai.convEscCancel')}</span>
      </span>

      <Popover>
        <PopoverTrigger
          className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-accent hover:text-foreground"
          aria-label={t('ai.convContextTitle')}
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
              className={warn ? 'text-amber-500' : ''}
            />
          </svg>
          <span className={warn ? 'text-amber-600 dark:text-amber-400' : ''}>{percent}%</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[240px] p-3">
          <div className="flex flex-col gap-2">
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
              <li className="flex justify-between border-t border-border pt-1 mt-1">
                <span>Window</span>
                <span className="font-mono">{maxRaw.toLocaleString()}</span>
              </li>
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 h-8 w-full cursor-pointer gap-1.5 text-xs"
              onClick={() => void compressConversation()}
              disabled={compressDisabled}
            >
              <Sparkles className="size-3" />
              <span>{isGenerating ? t('ai.convCompressing') : t('ai.convCompress')}</span>
            </Button>
            <p className="text-[10px] leading-snug text-muted-foreground">{t('ai.convCompressHint')}</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
