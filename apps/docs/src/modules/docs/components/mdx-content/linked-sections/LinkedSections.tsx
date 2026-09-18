import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

import { LinkedCard } from '../linked-card';
import { getLinkedSectionRowSizes } from './utils';

export type LinkedSectionItem = {
  title: string;
  description: string;
  url: string;
};

export type LinkedSectionsProps = {
  items: Array<LinkedSectionItem>;
};

const linkedSectionMinWidth = 250;
const linkedSectionGap = 16;

/** 以统一的响应式网格呈现文档章节入口。 */
export const LinkedSections: FC<LinkedSectionsProps> = props => {
  const { items } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxColumns, setMaxColumns] = useState(1);
  const rowSizes = getLinkedSectionRowSizes(items.length, maxColumns);
  const rows = rowSizes.map((rowSize, index) => {
    const startIndex = rowSizes.slice(0, index).reduce((sum, size) => sum + size, 0);

    return items.slice(startIndex, startIndex + rowSize);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container == null || typeof ResizeObserver === 'undefined') return undefined;

    const updateMaxColumns = (width: number): void => {
      const nextMaxColumns = Math.max(
        1,
        Math.floor((width + linkedSectionGap) / (linkedSectionMinWidth + linkedSectionGap)),
      );
      setMaxColumns(currentMaxColumns => (currentMaxColumns === nextMaxColumns ? currentMaxColumns : nextMaxColumns));
    };
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) updateMaxColumns(entry.contentRect.width);
    });

    updateMaxColumns(container.clientWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} data-linked-sections className="my-6 space-y-4">
      {rows.map(rowItems => (
        <div
          key={rowItems[0]?.url}
          data-linked-section-row
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${rowItems.length}, minmax(0, 1fr))` }}
        >
          {rowItems.map(item => (
            <LinkedCard key={item.url} href={item.url}>
              <span className="font-semibold">{item.title}</span>
              <span className="mt-1 text-center text-sm text-muted-foreground">{item.description}</span>
            </LinkedCard>
          ))}
        </div>
      ))}
    </div>
  );
};
