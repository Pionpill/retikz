import { Check } from 'lucide-react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Lang } from '@/i18n';
import { cn } from '@/lib/utils';

import {
  type Match,
  type SearchEntry,
  findMatch,
  renderHighlighted,
  renderSnippet,
  useSearchEntries,
} from './searchEngine';
import { type SearchIndex, loadSearchIndex } from './searchIndex';

/** Dialog（DocsSearch）和 popover（AI Add Context）共用的 cmdk 内部尺寸 / 颜色 token */
const DEFAULT_COMMAND_CLASS =
  '**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5';

export type DocsSearchPanelProps = {
  /** 用户选中（点击 / Enter）一项时回调 */
  onSelect: (entry: SearchEntry) => void;
  /** 某项是否处于"已选"态；提供则在右侧渲染 ✓，常用于多选场景 */
  isSelected?: (entry: SearchEntry) => boolean;
  placeholder: string;
  emptyText: string;
  /** 是否激活（用于 lazy 加载 searchIndex）；popover 关闭时传 false 避免无效 fetch */
  active?: boolean;
  /** 覆盖 Command 外层 className（一般用于尺寸 token，比如 popover 想要更紧凑） */
  commandClassName?: string;
};

/**
 * 文档搜索面板核心
 * @description 负责 lazy 加载 searchIndex、input debounce、entries / matches 计算、Command UI 渲染。
 *   不关心容器（Dialog / Popover），由调用方包外壳。多选场景传 isSelected 即可。
 */
export const DocsSearchPanel: FC<DocsSearchPanelProps> = ({
  onSelect,
  isSelected,
  placeholder,
  emptyText,
  active = true,
  commandClassName,
}) => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? 'zh') as Lang;
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [searchIndex, setSearchIndex] = useState<SearchIndex>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!active) return;
    let stillActive = true;
    void loadSearchIndex().then(index => {
      if (stillActive) setSearchIndex(index);
    });
    return () => {
      stillActive = false;
    };
  }, [active]);

  const entries = useSearchEntries(searchIndex, lang);

  const grouped = useMemo(() => {
    const matched: Array<{ entry: SearchEntry; match: Match }> = [];
    for (const entry of entries) {
      const match = findMatch(debouncedInput, entry);
      if (match) matched.push({ entry, match });
    }
    matched.sort((a, b) => b.match.score - a.match.score);
    const map = new Map<string, Array<{ entry: SearchEntry; match: Match }>>();
    for (const item of matched) {
      const list = map.get(item.entry.moduleLabel) ?? [];
      list.push(item);
      map.set(item.entry.moduleLabel, list);
    }
    return Array.from(map.entries());
  }, [entries, debouncedInput]);

  return (
    <Command shouldFilter={false} className={cn(commandClassName ?? DEFAULT_COMMAND_CLASS)}>
      <CommandInput placeholder={placeholder} value={input} onValueChange={setInput} />
      <CommandList>
        {grouped.length === 0 ? (
          <CommandEmpty>{emptyText}</CommandEmpty>
        ) : (
          grouped.map(([moduleLabel, items]) => (
            <CommandGroup key={moduleLabel} heading={moduleLabel}>
              {items.map(({ entry, match }) => {
                const selected = isSelected?.(entry) ?? false;
                return (
                  <CommandItem
                    key={entry.path}
                    value={entry.path}
                    onSelect={() => onSelect(entry)}
                    className="flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="truncate">
                        {match.kind === 'label'
                          ? renderHighlighted(entry.label, match.index, match.queryLength)
                          : entry.label}
                      </span>
                      {(entry.sectionLabel || entry.parentLabel) && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {[entry.sectionLabel, entry.parentLabel].filter(Boolean).join(' / ')}
                        </span>
                      )}
                      {selected && <Check className="size-3.5 shrink-0 text-foreground" />}
                    </div>
                    {match.kind !== 'label' && match.text && (
                      <span className="line-clamp-1 w-full truncate text-xs text-muted-foreground">
                        {renderSnippet(match.text, match.index, match.queryLength)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))
        )}
      </CommandList>
    </Command>
  );
};
