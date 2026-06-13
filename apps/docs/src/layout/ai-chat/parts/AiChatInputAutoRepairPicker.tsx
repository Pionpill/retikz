import { Ban, Infinity as InfinityIcon, type LucideIcon, Wrench } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type AutoRepairMode, useAiChatStore } from '@/store/use-ai-chat-store';

const MODES: ReadonlyArray<AutoRepairMode> = ['off', 'limited', 'always'];

const LABEL_KEY = {
  off: 'ai.autoRepairOff',
  limited: 'ai.autoRepairLimited',
  always: 'ai.autoRepairAlways',
} as const;

const DESC_KEY = {
  off: 'ai.autoRepairDescOff',
  limited: 'ai.autoRepairDescLimited',
  always: 'ai.autoRepairDescAlways',
} as const;

const MODE_ICON: Record<AutoRepairMode, LucideIcon> = {
  off: Ban,
  limited: Wrench,
  always: InfinityIcon,
};

/**
 * Auto-Repair Mode picker：off / limited / always 单选 popover
 * @description trigger 仅显示当前 mode 的 icon（off=Ban / limited=Wrench / always=WandSparkles），
 *   tooltip 显示「Auto-repair · 当前模式名」；popover 列表每项 icon + label + 描述。与 DiagramFormatPicker 同款骨架
 */
export const AiChatInputAutoRepairPicker: FC = () => {
  const { t } = useTranslation();
  const mode = useAiChatStore(s => s.autoRepairMode);
  const setMode = useAiChatStore(s => s.setAutoRepairMode);
  const [open, setOpen] = useState(false);
  const ActiveIcon = MODE_ICON[mode];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger
              className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t('ai.autoRepairLabel')}
            >
              <ActiveIcon className="size-3.5" />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {t('ai.autoRepairLabel')} · {t(LABEL_KEY[mode])}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-[280px] p-1">
        <ul>
          {MODES.map(m => {
            const isActive = m === mode;
            const Icon = MODE_ICON[m];
            return (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => {
                    setMode(m);
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
                      <span className="text-sm">{t(LABEL_KEY[m])}</span>
                      {isActive && <span className="text-xs">✓</span>}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{t(DESC_KEY[m])}</span>
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
