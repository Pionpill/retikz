import type { IRTableTrackSize } from '@retikz/table';

import { Layout } from '@retikz/react';
import { DetailColumn, DetailTable } from '@retikz/table-react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, tableLayoutPlaygroundControls } from './table-layout-playground.en.controls';
import { tableLayoutPlaygroundRows } from './table-layout-playground.en.data';

/** Controls fallback for the DetailTable layout playground */
export const previewControls = tableLayoutPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
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
    <Layout
      width={440}
      height={240}
      viewBox={{ x: -110, y: -32, width: 660, height: 340 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
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
            outer: { kind: 'line', stroke: 'currentColor', width: values.gridWidth },
            horizontal: { kind: 'line', stroke: 'lightgray', width: values.gridWidth },
            vertical: { kind: 'line', stroke: 'lightgray', width: values.gridWidth },
          },
        }}
      >
        <DetailColumn
          id="name"
          field="name"
          header="Name"
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4, horizontalAlign: 'start' }}
        />
        <DetailColumn
          id="group"
          field="group"
          header="Group"
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4 }}
        />
        <DetailColumn
          id="score"
          field="score"
          header="Score"
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4, horizontalAlign: 'end' }}
        />
        <DetailColumn
          id="status"
          field="status"
          header="Status"
          headerLayout={{ padding: 4 }}
          bodyLayout={{ padding: 4, horizontalAlign: 'center' }}
        />
        <DetailColumn
          id="note"
          field="note"
          header="Note"
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
});

/** Stable source configuration derived from the canonical state */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    scores: { from: './table-layout-playground.en.data', name: 'tableLayoutPlaygroundRows' },
  },
} satisfies PreviewSourceConfig;

/** DetailTable playground for tracks, Cell content policy, and the Border Graph */
export default controlledPreview.Component;
