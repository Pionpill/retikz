import { FileText, Plus, X } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DocsSearchPanel } from '@/components/shared/docs-search';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAiChatStore } from '@/store/useAiChatStore';

/** popover 内的 Command 紧凑变体：input h-9、item py-1.5、icon size-3.5 */
const COMPACT_COMMAND_CLASS =
  '**:data-[slot=command-input-wrapper]:h-9 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-9 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-1.5 [&_[cmdk-item]_svg]:h-3.5 [&_[cmdk-item]_svg]:w-3.5';

/**
 * AI Chat input 顶部 chips 行
 * @description 左侧 Add Context 按钮（点击弹 Popover，内嵌 DocsSearchPanel 共用搜索逻辑）
 *   + 右侧 chips（当前页 + 用户额外选中页）
 *   - 当前页自动加入 contextSelection，可手动 × 移除（不会自动再加回，直到导航到下一页）
 *   - chips 自动换行不出滚动条；chips 样式：仅 border，无背景填充
 *   - DocsSearchPanel 多选：点击 toggle，popover 保持打开；Esc 关闭
 */
export const AiChatInputContextChips: FC = () => {
  const { t } = useTranslation();
  const currentPage = useAiChatStore(s => s.currentPage);
  const contextSelection = useAiChatStore(s => s.contextSelection);
  const addContext = useAiChatStore(s => s.addContext);
  const removeContext = useAiChatStore(s => s.removeContext);

  const [pickerOpen, setPickerOpen] = useState(false);

  // 只在 currentPage 切换时触发；用户手动 remove 后不会自动加回，避免循环
  const currentPath = currentPage?.path ?? null;
  useEffect(() => {
    if (!currentPage) return;
    addContext({ path: currentPage.path, title: currentPage.title });
  }, [currentPath, addContext, currentPage]);

  const selectedPaths = new Set(contextSelection.map(c => c.path));

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={t('ai.convAddContext')}
        >
          <Plus className="size-2.5" />
          <span>{t('ai.convAddContext')}</span>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-[380px] overflow-hidden p-0">
          <DocsSearchPanel
            active={pickerOpen}
            placeholder={t('common.searchPlaceholder')}
            emptyText={t('common.searchEmpty')}
            commandClassName={COMPACT_COMMAND_CLASS}
            isSelected={entry => selectedPaths.has(entry.path)}
            onSelect={entry => {
              if (selectedPaths.has(entry.path)) {
                removeContext(entry.path);
              } else {
                addContext({ path: entry.path, title: entry.label });
              }
            }}
          />
        </PopoverContent>
      </Popover>

      {contextSelection.map(item => {
        const isCurrent = currentPage?.path === item.path;
        return (
          <span
            key={item.path}
            className="flex shrink-0 items-center gap-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-[11px]"
          >
            <FileText className="size-2.5 text-muted-foreground" />
            <span className="truncate">{item.title}</span>
            {isCurrent && <span className="text-[10px] text-muted-foreground">·{t('ai.convCurrentPageTag')}</span>}
            <button
              type="button"
              onClick={() => removeContext(item.path)}
              className="flex size-3.5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Remove"
            >
              <X className="size-2.5" />
            </button>
          </span>
        );
      })}
    </div>
  );
};
