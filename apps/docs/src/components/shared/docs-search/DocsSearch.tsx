import { Search } from 'lucide-react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Shortcut } from '@/components/shared/shortcut';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Page } from '@/data/interface';
import { modules } from '@/data/module';
import { getSectionsByModule } from '@/data/sections';

type SearchEntry = {
  /** 路由路径，点击 onSelect 时跳转 */
  path: string;
  /** 翻译后的页面标题 */
  label: string;
  /** 翻译后的模块名（用于分组 heading） */
  moduleLabel: string;
  /** 翻译后的栏目名（顶部 section 名，可空——profile 这类无 label） */
  sectionLabel?: string;
  /** 翻译后的父级页面名（仅 4 段子页有） */
  parentLabel?: string;
};

const useSearchEntries = (): Array<SearchEntry> => {
  const { t, i18n } = useTranslation();
  return useMemo(() => {
    const out: Array<SearchEntry> = [];
    // i18next t() 在 strict 模式下返回 string | undefined；统一包 String() 强转，避免向下传递时窄化报错
    for (const m of modules) {
      const moduleLabel = String(t(m.label));
      const sections = getSectionsByModule(m.id);
      for (const section of sections) {
        // ungrouped section（无 id + 无 label）下页面是 2 段 URL：`/<module>/<page>`
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
            out.push({
              path,
              label: pageLabel,
              moduleLabel,
              sectionLabel,
              parentLabel: parent?.label,
            });
          }
        };
        walk(section.pages, null);
      }
    }
    return out;
    // 语言切换时强制重算 label
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, i18n.resolvedLanguage]);
};

/**
 * 全站文档搜索：参考 shadcn / langchain docs 的 Cmd+K 风格。
 * 触发器是个 outline 输入框样的按钮，点击或 Ctrl/Cmd+K 打开 CommandDialog。
 * 数据源为 `data/` 下注册的模块 → 栏目 → 页树，按 label（i18n 翻译后）模糊匹配。
 */
export type DocsSearchProps = { className?: string };
export const DocsSearch: FC<DocsSearchProps> = ({ className }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const entries = useSearchEntries();

  const grouped = useMemo(() => {
    const map = new Map<string, Array<SearchEntry>>();
    entries.forEach(entry => {
      const list = map.get(entry.moduleLabel) ?? [];
      list.push(entry);
      map.set(entry.moduleLabel, list);
    });
    return Array.from(map.entries());
  }, [entries]);

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
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'relative h-8 w-9 justify-start gap-2 px-2 text-sm font-normal text-muted-foreground sm:w-44 sm:pr-12 lg:w-56',
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label={t('common.searchHint')}
      >
        <Search className="size-3.5 shrink-0" />
        <span className="hidden truncate sm:inline-flex">{t('common.search')}</span>
        <span className="pointer-events-none absolute top-1/2 right-1.5 hidden -translate-y-1/2 sm:flex">
          <Shortcut keys={['mod', 'K']} />
        </span>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('common.searchHint')}
        description={t('common.searchPlaceholder')}
      >
        <CommandInput placeholder={t('common.searchPlaceholder')} />
        <CommandList>
          <CommandEmpty>{t('common.searchEmpty')}</CommandEmpty>
          {grouped.map(([moduleLabel, items]) => (
            <CommandGroup key={moduleLabel} heading={moduleLabel}>
              {items.map(item => (
                <CommandItem
                  key={item.path}
                  value={`${item.label} ${item.sectionLabel ?? ''} ${item.parentLabel ?? ''} ${item.moduleLabel}`}
                  onSelect={() => handleSelect(item.path)}
                >
                  <span className="truncate">{item.label}</span>
                  {(item.sectionLabel || item.parentLabel) && (
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {[item.sectionLabel, item.parentLabel].filter(Boolean).join(' / ')}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};
