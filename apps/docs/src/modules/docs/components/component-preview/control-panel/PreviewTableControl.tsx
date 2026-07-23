import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import { cn } from '@/lib';

import type { PreviewTableControlField } from '../types';

import {
  formatPreviewTableCell,
  PREVIEW_TABLE_DEFAULT_VISIBLE_ROWS,
  PREVIEW_TABLE_MAX_ROWS,
  resolvePreviewTableColumns,
} from './table-utils';

/** 只读二维表格属性 */
export type PreviewTableControlProps = {
  /** 二维表格字段定义 */
  field: PreviewTableControlField;
  /** 控件面板密度
   * @default default
   */
  density?: 'compact' | 'default';
};

/** 在属性面板内显示只读二维数据 */
export const PreviewTableControl: FC<PreviewTableControlProps> = props => {
  const { field, density = 'default' } = props;
  const { t } = useTranslation();
  const compact = density === 'compact';
  const columns = resolvePreviewTableColumns(field);
  const visibleRows = field.rows.slice(0, PREVIEW_TABLE_MAX_ROWS);
  const rowHeight = compact ? 24 : 28;
  const scrollAreaMaxHeight = rowHeight * (PREVIEW_TABLE_DEFAULT_VISIBLE_ROWS + 1) + 2;

  return (
    <div data-slot="preview-table-control" data-table-density={density} className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium" title={field.label}>
          {field.label}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {t('preview.tableDimensions', { rows: field.rows.length, columns: columns.length })}
        </span>
      </div>
      {field.rows.length === 0 || columns.length === 0 ? (
        <div className="rounded-md border border-dashed px-2 py-4 text-center text-xs text-muted-foreground">
          {t('preview.tableEmpty')}
        </div>
      ) : (
        <>
          <div
            data-slot="preview-table-scroll-area"
            data-visible-body-rows={PREVIEW_TABLE_DEFAULT_VISIBLE_ROWS}
            className="max-w-full overflow-auto rounded-md border bg-background"
            style={{ maxHeight: `${scrollAreaMaxHeight}px` }}
          >
            <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th
                      key={column.key}
                      data-slot="preview-table-header-cell"
                      scope="col"
                      className={cn(
                        'sticky top-0 z-10 border-r border-b bg-muted/95 text-left font-medium whitespace-nowrap text-muted-foreground last:border-r-0',
                        compact ? 'h-6 px-1.5' : 'h-7 px-2',
                      )}
                    >
                      {column.label ?? column.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} data-slot="preview-table-row" className="last:[&>td]:border-b-0">
                    {columns.map(column => {
                      const cell = formatPreviewTableCell(Reflect.get(row, column.key));
                      return (
                        <td
                          key={column.key}
                          data-preview-table-numeric={String(cell.numeric)}
                          title={cell.text}
                          className={cn(
                            'max-w-48 truncate border-r border-b whitespace-nowrap last:border-r-0',
                            cell.numeric ? 'text-right font-mono tabular-nums' : 'text-left',
                            compact ? 'h-6 px-1.5' : 'h-7 px-2',
                          )}
                        >
                          {cell.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {field.rows.length > visibleRows.length ? (
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {t('preview.tableVisibleRows', { shown: visibleRows.length, total: field.rows.length })}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};
