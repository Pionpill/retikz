import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, tableLayoutPlaygroundControls } from './table-layout-playground.en.controls';
import { TableLayoutPlaygroundPreview } from './table-layout-playground.preview';

/** Controls fallback for the DetailTable layout playground */
export const previewControls = tableLayoutPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TableLayoutPlaygroundPreview(
    {
      columnMode: values.columnMode,
      columnMinWidth: values.columnMinWidth,
      columnMaxWidth: values.columnMaxWidth,
      columnWidth: values.columnWidth,
      rowMode: values.rowMode,
      rowHeight: values.rowHeight,
      cellBorderEnabled: values.cellBorderEnabled,
      cellBorderPriority: values.cellBorderPriority,
      columnGap: values.columnGap,
      rowGap: values.rowGap,
      borderMode: values.borderMode,
      gridWidth: values.gridWidth,
      padding: values.padding,
      horizontalAlign: values.horizontalAlign,
      verticalAlign: values.verticalAlign,
      wrap: values.wrap,
      fit: values.fit,
      overflow: values.overflow,
    },
    'en',
  ),
);

/** Stable source configuration derived from the canonical state */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    scores: { from: './table-layout-playground.en.data', name: 'tableLayoutPlaygroundRows' },
  },
} satisfies PreviewSourceConfig;

/** DetailTable playground for tracks, Cell content policy, and the Border Graph */
const Preview = controlledPreview.Component;

export default Preview;
