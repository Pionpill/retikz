import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { ComponentPreviewFiles } from '../../component-preview';
import { ComponentPreviewThumbnail } from '../../component-preview';
import { getLinkedSectionRowSizes } from '../linked-sections';

export type ComponentPreviewsItem = {
  /** 复用已有文档 demo，支持从 contents 根目录开始的绝对路径 */
  files: ComponentPreviewFiles;
  /** 图下方的名称 */
  title: string;
  /** 对应文档页 */
  url: string;
};

export type ComponentPreviewsProps = {
  items: Array<ComponentPreviewsItem>;
};

const previewMinWidth = 280;

const previewGap = 16;

/** 在等宽、均衡分行的网格中只展示已有 demo 图形 */
export const ComponentPreviews: FC<ComponentPreviewsProps> = props => {
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
      const nextMaxColumns = Math.max(1, Math.floor((width + previewGap) / (previewMinWidth + previewGap)));
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
    <div ref={containerRef} data-component-previews className="my-6 min-w-0 space-y-4">
      {rows.map(rowItems => (
        <div
          key={rowItems[0]?.url}
          data-component-previews-row
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${rowItems.length}, minmax(0, 1fr))` }}
        >
          {rowItems.map(item => (
            <Link
              key={item.url}
              to={item.url}
              data-component-previews-item
              className="group min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ComponentPreviewThumbnail files={item.files} className="aspect-3/2 bg-transparent p-0" />
              <span className="mt-1 block text-center text-sm font-medium group-hover:underline">{item.title}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
};
