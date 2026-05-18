import { Feather, Layers, type LucideIcon, Scale } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const MODE_ICON: Record<ContextMode, LucideIcon> = {
  lean: Feather,
  balanced: Scale,
  heavy: Layers,
};

/**
 * Context Mode picker：lean / balanced / heavy 单选 popover
 * @description trigger 仅显示当前模式 icon（lean=Feather / balanced=Scale / heavy=Layers），
 *   tooltip 显示「Context Mode · 当前模式名」；popover 列表每项保留 label + 描述
 */
export const AiChatInputContextModePicker: FC = () => {
  const { t } = useTranslation();
  const contextMode = useAiChatStore(s => s.contextMode);
  const setContextMode = useAiChatStore(s => s.setContextMode);
  const [open, setOpen] = useState(false);
  const ActiveIcon = MODE_ICON[contextMode];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger
              className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t('ai.convContextModeLabel')}
            >
              <ActiveIcon className="size-3.5" />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {t('ai.convContextModeLabel')} · {t(LABEL_KEY[contextMode])}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-[260px] p-1">
        <ul>
          {MODES.map(mode => {
            const isActive = mode === contextMode;
            const Icon = MODE_ICON[mode];
            return (
              <li key={mode}>
                <button
                  type="button"
                  onClick={() => {
                    setContextMode(mode);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-accent',
                    isActive && 'bg-accent',
                  )}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex w-full items-center justify-between">
                      <span className="text-sm">{t(LABEL_KEY[mode])}</span>
                      {isActive && <span className="text-xs">✓</span>}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{t(DESC_KEY[mode])}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
