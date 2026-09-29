import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, tableLayoutPlaygroundControls } from './table-layout-playground.controls';
import { TableLayoutPlaygroundPreview } from './table-layout-playground.preview';

/** 注册回退使用的 DetailTable 布局控件 */
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
    'zh',
  ),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    scores: { from: './table-layout-playground.zh.data', name: 'tableLayoutPlaygroundRows' },
  },
} satisfies PreviewSourceConfig;

/** 操作轨道、Cell 内容策略与 Border Graph 的 DetailTable 试验场 */
const Preview = controlledPreview.Component;

export default Preview;
