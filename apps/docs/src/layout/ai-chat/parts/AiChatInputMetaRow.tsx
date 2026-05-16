import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Kbd } from '@/components/ui/kbd';
import { useAiChatStore } from '@/store/useAiChatStore';
import { FALLBACK_CONTEXT_LIMIT, MODEL_CONTEXT_LIMIT } from '../models';

const CIRCLE_RADIUS = 4.5;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

/**
 * Prompt 框下方 meta 行
 * @description 左侧 [Esc] kbd + "取消生成" 提示（始终可见，给用户可见快捷线索）；
 *   右侧上下文用量圆环 + 百分比，按 MODEL_CONTEXT_LIMIT 估算当前模型窗口占比，
 *   超 80% 切 warning 色
 */
export const AiChatInputMetaRow: FC = () => {
  const { t } = useTranslation();
  const providerId = useAiChatStore(s => s.providerId);
  const model = useAiChatStore(s => s.models[providerId]);
  const usage = useAiChatStore(s => s.usage);

  const { percent, used, max } = useMemo(() => {
    const usedTokens = usage.input + usage.output;
    const knownLimit = (MODEL_CONTEXT_LIMIT as Record<string, number | undefined>)[model];
    const maxTokens = knownLimit ?? FALLBACK_CONTEXT_LIMIT;
    const ratio = maxTokens > 0 ? Math.min(1, usedTokens / maxTokens) : 0;
    return {
      percent: Math.round(ratio * 100),
      used: Math.round(usedTokens / 1000),
      max: Math.round(maxTokens / 1000),
    };
  }, [usage, model]);

  const dashOffset = CIRCUMFERENCE * (1 - percent / 100);
  const warn = percent >= 80;

  return (
    <div className="flex items-center justify-between gap-2 px-1 pt-1.5 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Kbd className="h-3.5 px-1 text-[9px]">Esc</Kbd>
        <span>{t('ai.convEscCancel')}</span>
      </span>
      <span
        className="flex items-center gap-1"
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
            className={warn ? 'text-amber-500' : ''}
          />
        </svg>
        <span className={warn ? 'text-amber-600 dark:text-amber-400' : ''}>{percent}%</span>
      </span>
    </div>
  );
};
