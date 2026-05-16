import { FileText, Plus, X } from 'lucide-react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useDocPageEntries } from '@/data/useDocPageEntries';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';

/**
 * AI Chat input 顶部 chips 行
 * @description 左侧 Add Context 按钮 + 右侧 chips（当前页 + 用户额外选中页）
 *   - 当前页自动加入 contextSelection，但用户仍可手动 × 移除（不会自动再加回，
 *     直到导航到下一页）
 *   - chips 自动换行不出滚动条；chips 样式：仅 border，无背景填充
 *   - 点击 Add Context 弹 CommandDialog 单选 toggle 累加，多次点击叠加多个 chip
 */
export const AiChatInputContextChips: FC = () => {
  const { t } = useTranslation();
  const currentPage = useAiChatStore(s => s.currentPage);
  const contextSelection = useAiChatStore(s => s.contextSelection);
  const addContext = useAiChatStore(s => s.addContext);
  const removeContext = useAiChatStore(s => s.removeContext);

  const [pickerOpen, setPickerOpen] = useState(false);

  // 当前页变化时自动加入选择集；如已被用户移除（path 不在 selection 里）则保持移除态，
  // 直到下次切页再尝试加
  // 只在 currentPage 切换时触发；用户手动 remove 后不会自动加回，避免循环
  const currentPath = currentPage?.path ?? null;
  useEffect(() => {
    if (!currentPage) return;
    addContext({ path: currentPage.path, title: currentPage.title });
  }, [currentPath, addContext, currentPage]);

  const entries = useDocPageEntries();
  const grouped = useMemo(() => {
    const map = new Map<string, ReturnType<typeof useDocPageEntries>>();
    entries.forEach(e => {
      const list = map.get(e.moduleLabel) ?? [];
      list.push(e);
      map.set(e.moduleLabel, list);
    });
    return Array.from(map.entries());
  }, [entries]);

  const selectedPaths = new Set(contextSelection.map(c => c.path));

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="size-2.5" />
          <span>{t('ai.convAddContext')}</span>
        </button>

        {contextSelection.map(item => {
          const isCurrent = currentPage?.path === item.path;
          return (
            <span
              key={item.path}
              className="flex shrink-0 items-center gap-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-[11px]"
            >
              <FileText className="size-2.5 text-muted-foreground" />
              <span className="truncate">{item.title}</span>
              {isCurrent && (
                <span className="text-[10px] text-muted-foreground">·{t('ai.convCurrentPageTag')}</span>
              )}
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

      <CommandDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={t('ai.convAddContext')}
        description={t('ai.convAddContext')}
      >
        <CommandInput placeholder={t('ai.convAddContext')} />
        <CommandList>
          <CommandEmpty>{t('common.searchEmpty')}</CommandEmpty>
          {grouped.map(([moduleLabel, items]) => (
            <CommandGroup key={moduleLabel} heading={moduleLabel}>
              {items.map(item => {
                const isSelected = selectedPaths.has(item.path);
                return (
                  <CommandItem
                    key={item.path}
                    value={`${item.label} ${item.sectionLabel ?? ''} ${item.parentLabel ?? ''} ${item.moduleLabel}`}
                    onSelect={() => {
                      if (isSelected) {
                        removeContext(item.path);
                      } else {
                        addContext({ path: item.path, title: item.label });
                      }
                    }}
                  >
                    <FileText
                      className={cn('size-3.5', isSelected ? 'text-foreground' : 'text-muted-foreground')}
                    />
                    <span className="truncate">{item.label}</span>
                    {(item.sectionLabel || item.parentLabel) && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {[item.sectionLabel, item.parentLabel].filter(Boolean).join(' / ')}
                      </span>
                    )}
                    {isSelected && <span className="ml-2 text-[10px] text-muted-foreground">✓</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};
