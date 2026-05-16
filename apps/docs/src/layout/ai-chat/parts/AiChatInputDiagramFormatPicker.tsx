import { ChevronDown, Shapes } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
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

/**
 * Diagram Format picker：auto / ir / tsx 单选 popover
 * @description 与 ContextMode / Model picker 同型；选中后即时同步到 store + persist；
 *   下次发起对话 composeSystem 会按此偏好拼出"画图协议"段的强约束语句
 */
export const AiChatInputDiagramFormatPicker: FC = () => {
  const { t } = useTranslation();
  const preference = useAiChatStore(s => s.diagramFormatPreference);
  const setPreference = useAiChatStore(s => s.setDiagramFormatPreference);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t('ai.diagramFormatLabel')}
      >
        <Shapes className="size-3" />
        <span>{t(LABEL_KEY[preference])}</span>
        <ChevronDown className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-1">
        <ul>
          {PREFERENCES.map(pref => {
            const isActive = pref === preference;
            return (
              <li key={pref}>
                <button
                  type="button"
                  onClick={() => {
                    setPreference(pref);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full cursor-pointer flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left hover:bg-accent',
                    isActive && 'bg-accent',
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-sm">{t(LABEL_KEY[pref])}</span>
                    {isActive && <span className="text-xs">✓</span>}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{t(DESC_KEY[pref])}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
