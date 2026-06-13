import { Braces, FileCode2, type LucideIcon, Sparkles } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/use-ai-chat-store';
import type { DiagramFormatPreference } from '../context';

const PREFERENCES: ReadonlyArray<DiagramFormatPreference> = ['auto', 'ir', 'tsx'];

const LABEL_KEY = {
  auto: 'ai.diagramFormatAuto',
  ir: 'ai.diagramFormatIR',
  tsx: 'ai.diagramFormatTsx',
} as const;

const DESC_KEY = {
  auto: 'ai.diagramFormatDescAuto',
  ir: 'ai.diagramFormatDescIR',
  tsx: 'ai.diagramFormatDescTsx',
} as const;

const FORMAT_ICON: Record<DiagramFormatPreference, LucideIcon> = {
  auto: Sparkles,
  ir: Braces,
  tsx: FileCode2,
};

/**
 * Diagram Format picker：auto / ir / tsx 单选 popover
 * @description trigger 仅显示当前格式 icon（auto=Sparkles / ir=Braces / tsx=FileCode2），
 *   tooltip 显示「Format · 当前模式名」；popover 列表每项保留 icon + label + 描述
 */
export const AiChatInputDiagramFormatPicker: FC = () => {
  const { t } = useTranslation();
  const preference = useAiChatStore(s => s.diagramFormatPreference);
  const setPreference = useAiChatStore(s => s.setDiagramFormatPreference);
  const [open, setOpen] = useState(false);
  const ActiveIcon = FORMAT_ICON[preference];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger
              className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t('ai.diagramFormatLabel')}
            >
              <ActiveIcon className="size-3.5" />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {t('ai.diagramFormatLabel')} · {t(LABEL_KEY[preference])}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-[260px] p-1">
        <ul>
          {PREFERENCES.map(pref => {
            const isActive = pref === preference;
            const Icon = FORMAT_ICON[pref];
            return (
              <li key={pref}>
                <button
                  type="button"
                  onClick={() => {
                    setPreference(pref);
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
                      <span className="text-sm">{t(LABEL_KEY[pref])}</span>
                      {isActive && <span className="text-xs">✓</span>}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{t(DESC_KEY[pref])}</span>
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
