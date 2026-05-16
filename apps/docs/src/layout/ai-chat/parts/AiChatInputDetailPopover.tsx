import { FileText, Files } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAiChatStore } from '@/store/useAiChatStore';

/** 当前页 mdx 字符数 / 4 的粗略 tokens 估算 */
const estimateTokens = (chars: number): number => Math.round(chars / 4);

/**
 * Header 右侧 Detail 按钮（Files icon）+ popover
 * @description 展示当前已引用的文件列表（含 system prompt 一行）；
 *   上下文用量 + 压缩按钮在 toolbar 右侧的 Context Usage 圆环 popover 里
 */
export const AiChatInputDetailPopover: FC = () => {
  const { t } = useTranslation();
  const currentPage = useAiChatStore(s => s.currentPage);
  const contextSelection = useAiChatStore(s => s.contextSelection);

  const [open, setOpen] = useState(false);

  const currentPageTokens = currentPage ? estimateTokens(currentPage.mdx.length) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={t('ai.convDetailLabel')}
        title={t('ai.convDetailLabel')}
      >
        <Files className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="border-b border-border px-3 py-2 text-xs font-medium">
          {t('ai.convDetailReferenced')}
        </div>
        <ul className="max-h-[220px] overflow-y-auto py-1 text-sm">
          {contextSelection.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t('ai.convNoPageContext')}</li>
          ) : (
            contextSelection.map(item => {
              const isCurrent = currentPage?.path === item.path;
              return (
                <li
                  key={item.path}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-accent"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{item.title}</span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">{item.path}</span>
                    </div>
                  </div>
                  {isCurrent && currentPageTokens > 0 && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      ~ {(currentPageTokens / 1000).toFixed(1)}K
                    </span>
                  )}
                </li>
              );
            })
          )}
          <li className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            <span>{t('ai.convSystemPromptLabel')}</span>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
};
