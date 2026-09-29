import { Layout } from '@retikz/react';
import type { IRTableTrackSize } from '@retikz/table';
import { DetailColumn } from '@retikz/table-react';

import type { Lang } from '@/i18n';
import { PreviewDetailTable as DetailTable } from '@/modules/docs/components/component-preview/theme';

import { tableLayoutPlaygroundI18n } from './table-layout-playground.i18n';
import { tableLayoutPlaygroundRows } from './table-layout-playground.zh.data';

/** 图形参数 */
export type TableLayoutPlaygroundPreviewValues = {
  columnMode: 'fixed' | 'auto' | 'minmax';
  columnMinWidth: number;
  columnMaxWidth: number;
  columnWidth: number;
  rowMode: 'fixed' | 'auto';
  rowHeight: number;
  cellBorderEnabled: boolean;
  cellBorderPriority: number;
  columnGap: number;
  rowGap: number;
  borderMode: 'collapse' | 'separate';
  gridWidth: number;
  padding: number;
  horizontalAlign: 'start' | 'center' | 'end';
  verticalAlign: 'start' | 'center' | 'end';
  wrap: boolean;
  fit: 'none' | 'contain' | 'cover' | 'stretch';
  overflow: 'clip' | 'visible';
};

/** 绘制示例图形 */
export const TableLayoutPlaygroundPreview = (values: TableLayoutPlaygroundPreviewValues, lang: Lang) => {
  const i18n = tableLayoutPlaygroundI18n[lang];
  const noteColumnSize: IRTableTrackSize =
    values.columnMode === 'auto'
      ? { kind: 'auto' }
      : values.columnMode === 'minmax'
        ? {
            kind: 'minmax',
            min: { kind: 'fixed', value: values.columnMinWidth },
            max: { kind: 'fixed', value: values.columnMaxWidth },
          }
        : { kind: 'fixed', value: values.columnWidth };
  const bodyRowSize: IRTableTrackSize =
    values.rowMode === 'auto' ? { kind: 'auto' } : { kind: 'fixed', value: values.rowHeight };
  const noteBorders = values.cellBorderEnabled
    ? {
        left: {
          kind: 'line' as const,
          stroke: '#2563eb' as const,
          width: 3,
          priority: values.cellBorderPriority,
        },
      }
    : undefined;

  return (
    <Layout viewBox={{ x: -110, y: -32, width: 660, height: 340 }}>
      <DetailTable
        id="score-layout-playground"
        dataRef="scores"
        data={tableLayoutPlaygroundRows}
        layout={{
          columnSize: { kind: 'fixed', value: 80 },
          rowSize: bodyRowSize,
          headerRowSize: { kind: 'fixed', value: 36 },
          columns: [
            { index: 0, size: { kind: 'fixed', value: 88 } },
            { index: 1, size: { kind: 'fixed', value: 56 } },
            { index: 2, size: { kind: 'fixed', value: 60 } },
            { index: 3, size: { kind: 'fixed', value: 64 } },
            { index: 4, size: noteColumnSize },
          ],
          columnGap: values.columnGap,
          rowGap: values.rowGap,
          borders: {
            mode: values.borderMode,
            outer: {
              top: { kind: 'line', stroke: 'currentColor', width: values.gridWidth },
              right: { kind: 'line', stroke: 'currentColor', width: values.gridWidth },
              bottom: { kind: 'line', stroke: 'currentColor', width: values.gridWidth },
              left: { kind: 'line', stroke: 'currentColor', width: values.gridWidth },
            },
            horizontal: { kind: 'line', stroke: 'lightgray', width: values.gridWidth },
            vertical: { kind: 'line', stroke: 'lightgray', width: values.gridWidth },
          },
        }}
      >
        <DetailColumn
          id="name"
          field="name"
          header={i18n.name}
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4, horizontalAlign: 'start' }}
        />
        <DetailColumn
          id="group"
          field="group"
          header={i18n.group}
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4 }}
        />
        <DetailColumn
          id="score"
          field="score"
          header={i18n.score}
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4, horizontalAlign: 'end' }}
        />
        <DetailColumn
          id="status"
          field="status"
          header={i18n.status}
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4, horizontalAlign: 'center' }}
        />
        <DetailColumn
          id="note"
          field="note"
          header={i18n.note}
          headerLayout={{ padding: 4 }}
          bodyLayout={{
            padding: values.padding,
            horizontalAlign: values.horizontalAlign,
            verticalAlign: values.verticalAlign,
            wrap: values.wrap,
            fit: values.fit,
            overflow: values.overflow,
            ...(noteBorders === undefined ? {} : { borders: noteBorders }),
          }}
        />
      </DetailTable>
    </Layout>
  );
};
