import type { FC } from 'react';

import { parseStaticCssColor, StaticCssNamedColorHexByName } from '@retikz/foundation';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib';

/** 静态 CSS 命名颜色目录属性 */
export type StaticCssColorCatalogProps = {
  /** 搜索框的无障碍标签
   * @default 'Search named colors or CSS values'
   */
  searchLabel?: string;
  /** 无匹配结果的提示文案
   * @default 'No named colors match this query.'
   */
  emptyMessage?: string;
  /** 合法 CSS 值预览的说明文案
   * @default 'Static color preview'
   */
  previewLabel?: string;
};

const namedColorEntries = Object.entries(StaticCssNamedColorHexByName);

/** 将 Foundation 的归一化 sRGB 解析结果写成浏览器可绘制的 CSS 值 */
const cssColorFromInput = (input: string): string | null => {
  const color = parseStaticCssColor(input);
  if (color === null) return null;
  return `rgb(${Math.round(color.r * 255)} ${Math.round(color.g * 255)} ${Math.round(color.b * 255)} / ${color.a})`;
};

/** 使用 Foundation 支持的命名颜色清单，按名称或十六进制值筛选并预览静态 CSS 颜色 */
export const StaticCssColorCatalog: FC<StaticCssColorCatalogProps> = props => {
  const {
    searchLabel = 'Search named colors or CSS values',
    emptyMessage = 'No named colors match this query.',
    previewLabel = 'Static color preview',
  } = props;
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const matchingColors = useMemo(
    () =>
      normalizedQuery.length === 0
        ? namedColorEntries
        : namedColorEntries.filter(([name, hex]) => name.includes(normalizedQuery) || hex.includes(normalizedQuery)),
    [normalizedQuery],
  );
  const previewColor = cssColorFromInput(query);

  return (
    <section className="my-6 space-y-4" aria-label={searchLabel}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={searchLabel}
          value={query}
          placeholder={searchLabel}
          className="pl-9"
          onChange={event => setQuery(event.currentTarget.value)}
        />
      </div>

      {previewColor !== null ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3 text-sm">
          <span
            aria-hidden="true"
            data-static-css-color-preview
            className="size-8 shrink-0 rounded border shadow-xs"
            style={{ backgroundColor: previewColor }}
          />
          <span className="min-w-0 text-muted-foreground">
            {previewLabel}: <code>{query.trim()}</code>
          </span>
        </div>
      ) : null}

      {matchingColors.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div
          data-static-css-color-list
          className="grid max-h-[500px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {matchingColors.map(([name, hex]) => (
            <article
              key={name}
              data-static-css-color-card
              className={cn('flex min-w-0 items-center gap-3 rounded-md border bg-card p-3 text-sm')}
            >
              <span
                aria-hidden="true"
                className="size-9 shrink-0 rounded border shadow-xs"
                style={{ backgroundColor: hex }}
              />
              <span className="min-w-0">
                <code className="block truncate font-medium text-foreground">{name}</code>
                <code className="block text-xs text-muted-foreground">{hex}</code>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
