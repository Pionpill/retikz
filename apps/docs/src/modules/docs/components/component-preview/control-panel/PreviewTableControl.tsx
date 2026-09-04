import type { FC } from 'react';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib';

import type { PreviewControlValues, PreviewTableControlField, PreviewTableRows, PreviewTableView } from '../types';

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
  /** 当前实时控件值 */
  values: Readonly<PreviewControlValues>;
};

const STATIC_VIEW_ID = '__preview-table-static-view__';

/** 将单视图旧契约统一为 table view */
const tableViewsOf = (field: PreviewTableControlField): ReadonlyArray<PreviewTableView> =>
  field.views !== undefined
    ? field.views
    : [{ id: STATIC_VIEW_ID, label: field.label, rows: field.rows } satisfies PreviewTableView];

/** 解析当前 view，并把作者 resolver 错误约束在 table 内 */
const resolveTableRows = (
  view: PreviewTableView,
  values: Readonly<PreviewControlValues>,
): { rows: PreviewTableRows; error: boolean } => {
  try {
    return {
      rows: typeof view.rows === 'function' ? view.rows(values) : view.rows,
      error: false,
    };
  } catch {
    return { rows: [], error: true };
  }
};

/** 在属性面板内显示只读二维数据 */
export const PreviewTableControl: FC<PreviewTableControlProps> = props => {
  const { field, density = 'default', values } = props;
  const { t } = useTranslation();
  const compact = density === 'compact';
  const views = tableViewsOf(field);
  const [activeViewId, setActiveViewId] = useState(views[0].id);
  const activeView = views.find(view => view.id === activeViewId) ?? views[0];
  const resolved = resolveTableRows(activeView, values);
  const columns = resolvePreviewTableColumns(field, resolved.rows);
  const visibleRows = resolved.rows.slice(0, PREVIEW_TABLE_MAX_ROWS);
  const dimensions = t('preview.tableDimensions', { rows: resolved.rows.length, columns: columns.length });
  const compactDimensions = t('preview.tableDimensionsCompact', {
    rows: resolved.rows.length,
    columns: columns.length,
  });
  const rowHeight = compact ? 24 : 28;
  const scrollAreaMaxHeight = rowHeight * (PREVIEW_TABLE_DEFAULT_VISIBLE_ROWS + 1) + 2;

  return (
    <div data-slot="preview-table-control" data-table-density={density} className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium" title={field.label}>
          {field.label}
        </span>
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          {views.length > 1 ? (
            <div
              role="group"
              aria-label={field.label}
              data-slot="preview-table-view-switch"
              className="flex min-w-0 items-center rounded-md border bg-background p-0.5"
            >
              {views.map(view => (
                <Button
                  key={view.id}
                  type="button"
                  variant={view.id === activeView.id ? 'secondary' : 'ghost'}
                  size="xs"
                  aria-pressed={view.id === activeView.id}
                  data-slot="preview-table-view-trigger"
                  data-view-id={view.id}
                  className="h-5 min-w-0 px-1.5 text-[10px]"
                  onClick={() => setActiveViewId(view.id)}
                >
                  <span className="truncate">{view.label}</span>
                </Button>
              ))}
            </div>
          ) : null}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  data-slot="preview-table-dimensions"
                  aria-label={dimensions}
                  className="shrink-0 cursor-help text-[10px] tabular-nums text-muted-foreground"
                >
                  {compactDimensions}
                </span>
              </TooltipTrigger>
              <TooltipContent>{dimensions}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {resolved.error ? (
        <div
          data-slot="preview-table-view-error"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-4 text-center text-xs text-destructive"
        >
          {t('preview.tableViewError')}
        </div>
      ) : resolved.rows.length === 0 || columns.length === 0 ? (
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
                      {column.key}
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
          {resolved.rows.length > visibleRows.length ? (
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {t('preview.tableVisibleRows', { shown: visibleRows.length, total: resolved.rows.length })}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};
