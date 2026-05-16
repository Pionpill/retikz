import { ChevronDown } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import type { ContextMode } from '../context';

const MODES: ReadonlyArray<ContextMode> = ['lean', 'balanced', 'heavy'];

const LABEL_KEY = {
  lean: 'ai.settingsContextLean',
  balanced: 'ai.settingsContextBalanced',
  heavy: 'ai.settingsContextHeavy',
} as const;

const DESC_KEY = {
  lean: 'ai.settingsContextDescLean',
  balanced: 'ai.settingsContextDescBalanced',
  heavy: 'ai.settingsContextDescHeavy',
} as const;

/**
 * Context Mode picker：lean / balanced / heavy 单选 popover
 * @description label / 描述沿用原 Settings 里的 i18n key；popover 里每项右侧给一行小描述
 */
export const AiChatInputContextModePicker: FC = () => {
  const { t } = useTranslation();
  const contextMode = useAiChatStore(s => s.contextMode);
  const setContextMode = useAiChatStore(s => s.setContextMode);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t('ai.convContextModeLabel')}
      >
        <span>{t(LABEL_KEY[contextMode])}</span>
        <ChevronDown className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-1">
        <ul>
          {MODES.map(mode => {
            const isActive = mode === contextMode;
            return (
              <li key={mode}>
                <button
                  type="button"
                  onClick={() => {
                    setContextMode(mode);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full cursor-pointer flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent',
                    isActive && 'bg-accent',
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-sm">{t(LABEL_KEY[mode])}</span>
                    {isActive && <span className="text-xs">✓</span>}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{t(DESC_KEY[mode])}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
