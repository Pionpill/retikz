import { Search } from 'lucide-react';
import { type FC, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Shortcut } from '@/components/shared/shortcut';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Page } from '@/data/interface';
import { modules } from '@/data/module';
import { getSectionsByModule } from '@/data/sections';
import type { Lang } from '@/i18n';

import { type IndexedPage, type SearchIndex, loadSearchIndex } from './searchIndex';

/** 可被匹配的字段类型；优先级 label > description > heading > code */
type FieldKind = 'label' | 'description' | 'heading' | 'code';

type Field = {
  kind: FieldKind;
  /** 用于结果列表显示（保留原始大小写） */
  original: string;
  /** 用于匹配（已 toLowerCase） */
  lower: string;
};

type SearchEntry = {
  path: string;
  label: string;
  moduleLabel: string;
  sectionLabel?: string;
  parentLabel?: string;
  /** label + 当前语言下从 mdx 抽取的可搜索字段，按匹配优先级排好 */
  fields: ReadonlyArray<Field>;
};

const FIELD_WEIGHT: Record<FieldKind, number> = {
  label: 1000,
  description: 100,
  heading: 50,
  code: 30,
};

/** 结果列表 snippet 行最多展示这么多字符；超出在匹配位置开窗 + 前后省略号 */
const SNIPPET_LENGTH = 80;

const buildFields = (
  pageLabel: string,
  indexed: IndexedPage | undefined,
): ReadonlyArray<Field> => {
  const fields: Array<Field> = [
    { kind: 'label', original: pageLabel, lower: pageLabel.toLowerCase() },
  ];
  if (!indexed) return fields;
  if (indexed.description) {
    fields.push({
      kind: 'description',
      original: indexed.description,
      lower: indexed.description.toLowerCase(),
    });
  }
  for (const heading of indexed.headings) {
    fields.push({ kind: 'heading', original: heading, lower: heading.toLowerCase() });
  }
  for (const inlineCode of indexed.inlineCodes) {
    fields.push({ kind: 'code', original: inlineCode, lower: inlineCode.toLowerCase() });
  }
  return fields;
};

const useSearchEntries = (searchIndex: SearchIndex, lang: Lang): Array<SearchEntry> => {
  const { t, i18n } = useTranslation();
  return useMemo(() => {
    const out: Array<SearchEntry> = [];
    for (const m of modules) {
      const moduleLabel = String(t(m.label));
      const sections = getSectionsByModule(m.id);
      for (const section of sections) {
        const ungrouped = !section.id || !section.label;
        const sectionLabel = section.label ? String(t(section.label)) : undefined;
        const walk = (pages: Array<Page>, parent: { id: string; label: string } | null) => {
          for (const page of pages) {
            const pageLabel = String(t(page.label));
            if (page.children) {
              walk(page.children, { id: page.id, label: pageLabel });
              continue;
            }
            const path = ungrouped
              ? `/${m.id}/${page.id}`
              : parent
                ? `/${m.id}/${section.id}/${parent.id}/${page.id}`
                : `/${m.id}/${section.id}/${page.id}`;
            const indexed = searchIndex[path]?.[lang];
            out.push({
              path,
              label: pageLabel,
              moduleLabel,
              sectionLabel,
              parentLabel: parent?.label,
              fields: buildFields(pageLabel, indexed),
            });
          }
        };
        walk(section.pages, null);
      }
    }
    return out;
    // 语言切换时强制重算 label
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchIndex, lang, t, i18n.resolvedLanguage]);
};

type Match = {
  score: number;
  kind: FieldKind;
  /** 命中的原始字段文本（保留大小写） */
  text: string;
  /** 子串命中在 lower-cased text 中的位置；fuzzy 命中为 -1 */
  index: number;
  queryLength: number;
};

/**
 * 字段评分 + 命中记录
 * @description 按 entry.fields 顺序（label → description → heading → code）首次命中即返回——保证 label 命中永远优先于 body 命中。基础分：前缀 3 / 子串 2 / 字符跳跃 1，乘以字段权重得出最终 score 用于排序
 */
const findMatch = (query: string, entry: SearchEntry): Match | null => {
  const q = query.trim().toLowerCase();
  // < 2 字符视同空 query：全量展示按数据顺序的列表，不进入字段匹配——避免单字符触发大量低相关性命中
  if (q.length < 2) {
    return { score: 1, kind: 'label', text: entry.label, index: -1, queryLength: 0 };
  }
  for (const field of entry.fields) {
    const idx = field.lower.indexOf(q);
    let base = 0;
    if (idx === 0) base = 3;
    else if (idx > 0) base = 2;
    else {
      let qi = 0;
      for (let i = 0; i < field.lower.length && qi < q.length; i++) {
        if (field.lower[i] === q[qi]) qi++;
      }
      if (qi === q.length) base = 1;
    }
    if (base > 0) {
      return {
        score: base * FIELD_WEIGHT[field.kind],
        kind: field.kind,
        text: field.original,
        index: idx,
        queryLength: q.length,
      };
    }
  }
  return null;
};

const HIGHLIGHT_CLASS = 'rounded-sm bg-amber-200/70 px-0.5 text-foreground dark:bg-amber-500/30';

/** 在原始文本里把 [index, index+length) 的子串用 `<mark>` 包起来；index<0 或 length=0 直接原样返回 */
const renderHighlighted = (text: string, index: number, length: number): ReactNode => {
  if (index < 0 || length === 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className={HIGHLIGHT_CLASS}>{text.slice(index, index + length)}</mark>
      {text.slice(index + length)}
    </>
  );
};

/**
 * 结果项底部 snippet：在匹配位置周围开窗、首尾按需补 `…`
 * @description 子串命中时围绕 index 取 SNIPPET_LENGTH 窗；fuzzy 命中无单点位置，退化为前 80 字符 + 省略号
 */
const renderSnippet = (text: string, index: number, length: number): ReactNode => {
  if (index < 0 || length === 0) {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }
  if (text.length <= SNIPPET_LENGTH) {
    return renderHighlighted(text, index, length);
  }
  const halfRoom = Math.floor((SNIPPET_LENGTH - length) / 2);
  let start = Math.max(0, index - halfRoom);
  const end = Math.min(text.length, start + SNIPPET_LENGTH);
  if (end - start < SNIPPET_LENGTH) start = Math.max(0, end - SNIPPET_LENGTH);
  const windowed = text.slice(start, end);
  const localIndex = index - start;
  return (
    <>
      {start > 0 && '…'}
      {renderHighlighted(windowed, localIndex, length)}
      {end < text.length && '…'}
    </>
  );
};

const COMMAND_CLASS =
  '**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5';

/**
 * 全站文档搜索（Cmd+K）
 * @description 触发器是 outline 输入框样按钮，点击或 Ctrl/Cmd+K 打开 Dialog；首次打开时 lazy 加载所有 mdx 索引（per-language，单语下不搜另一语 mdx 内容）；输入做 300ms debounce 且 < 2 字符不过滤（单字符匹配结果意义不大）；命中字段不是 label 时在结果下方显示一行 snippet 并高亮 query 子串
 */
export type DocsSearchProps = { className?: string };
export const DocsSearch: FC<DocsSearchProps> = props => {
  const { className } = props;
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? 'zh') as Lang;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [searchIndex, setSearchIndex] = useState<SearchIndex>({});
  const navigate = useNavigate();

  // 输入做 300ms debounce：用户停手后才把值交给过滤逻辑；连续敲键的中间值不触发重算
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void loadSearchIndex().then(index => {
      if (active) setSearchIndex(index);
    });
    return () => {
      active = false;
    };
  }, [open]);

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    setInput('');
    setDebouncedInput('');
    navigate(path);
  };

  return (
    <>
      {/* 移动端：图标按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-7 cursor-pointer rounded-sm lg:hidden', className)}
        onClick={() => setOpen(true)}
        aria-label={t('common.searchHint')}
        title={t('common.searchHint')}
      >
        <Search className="size-4" />
      </Button>
      {/* 桌面端：输入框样式触发器 —— 点击或 Ctrl/Cmd+K 打开 Dialog */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('common.searchHint')}
        className={cn(
          'hidden lg:inline-flex h-8 w-56 xl:w-64 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer',
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{t('common.searchPlaceholder')}</span>
        <Shortcut keys={['mod', 'K']} className="tracking-normal" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('common.searchHint')}</DialogTitle>
            <DialogDescription>{t('common.searchPlaceholder')}</DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false} className={COMMAND_CLASS}>
            <CommandInput
              placeholder={t('common.searchPlaceholder')}
              value={input}
              onValueChange={setInput}
            />
            <CommandList>
              {grouped.length === 0 ? (
                <CommandEmpty>{t('common.searchEmpty')}</CommandEmpty>
              ) : (
                grouped.map(([moduleLabel, items]) => (
                  <CommandGroup key={moduleLabel} heading={moduleLabel}>
                    {items.map(({ entry, match }) => (
                      <CommandItem
                        key={entry.path}
                        value={entry.path}
                        onSelect={() => handleSelect(entry.path)}
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
                        </div>
                        {match.kind !== 'label' && match.text && (
                          <span className="line-clamp-1 w-full truncate text-xs text-muted-foreground">
                            {renderSnippet(match.text, match.index, match.queryLength)}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};
