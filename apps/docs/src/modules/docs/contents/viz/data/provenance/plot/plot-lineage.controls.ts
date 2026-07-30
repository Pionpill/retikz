import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sales } from './plot-lineage.data';

/** Plot 溯源示例的中文控件 */
export const plotLineageControls = definePreviewControls({
  presentation: 'panel',
  title: '溯源',
  defaultSize: 25,
  sections: [
    {
      label: '输入数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'rows', label: '销售记录', rows: sales }],
    },
    {
      label: '根级变换',
      controls: [
        {
          kind: 'switch',
          id: 'rootSortEnabled',
          label: '按收入排序',
          defaultValue: false,
        },
        {
          kind: 'select',
          id: 'rootSortOrder',
          label: '排序方向',
          defaultValue: 'descending',
          options: [
            { value: 'ascending', label: '升序' },
            { value: 'descending', label: '降序' },
          ],
          visibleWhen: { controlId: 'rootSortEnabled', oneOf: [true] },
        },
      ],
    },
    {
      label: '图元局部变换',
      controls: [
        {
          kind: 'switch',
          id: 'markSelectEnabled',
          label: '收入前 N 名',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: 'markTopN',
          label: '保留行数',
          defaultValue: 3,
          min: 1,
          max: sales.length,
          step: 1,
          visibleWhen: { controlId: 'markSelectEnabled', oneOf: [true] },
        },
      ],
    },
    {
      label: '记录范围',
      controls: [
        { kind: 'switch', id: 'markIdentity', label: '图元身份', defaultValue: true },
        { kind: 'switch', id: 'markEncoding', label: '编码字段', defaultValue: true },
        { kind: 'switch', id: 'scaleMappings', label: '比例尺映射', defaultValue: false },
        { kind: 'switch', id: 'layoutContext', label: '布局上下文', defaultValue: false },
      ],
    },
  ],
});

/** Plot 溯源示例的稳定文档契约 */
export const previewControlContract = {
  controls: plotLineageControls,
  canonicalValues: {
    markIdentity: true,
    markEncoding: true,
    scaleMappings: false,
    layoutContext: false,
    rootSortEnabled: false,
    rootSortOrder: 'descending',
    markSelectEnabled: false,
    markTopN: 3,
  },
  presets: [
    {
      id: 'minimal',
      label: '最小骨架',
      values: {
        markIdentity: false,
        markEncoding: false,
        scaleMappings: false,
        layoutContext: false,
        rootSortEnabled: false,
        rootSortOrder: 'descending',
        markSelectEnabled: false,
        markTopN: 3,
      },
    },
    {
      id: 'default',
      label: '默认摘要',
      values: {
        markIdentity: true,
        markEncoding: true,
        scaleMappings: false,
        layoutContext: false,
        rootSortEnabled: false,
        rootSortOrder: 'descending',
        markSelectEnabled: false,
        markTopN: 3,
      },
    },
    {
      id: 'transforms',
      label: '双层变换',
      values: {
        markIdentity: true,
        markEncoding: true,
        scaleMappings: false,
        layoutContext: false,
        rootSortEnabled: true,
        rootSortOrder: 'descending',
        markSelectEnabled: true,
        markTopN: 3,
      },
    },
    {
      id: 'visual',
      label: '完整图形语义',
      values: {
        markIdentity: true,
        markEncoding: true,
        scaleMappings: true,
        layoutContext: true,
        rootSortEnabled: false,
        rootSortOrder: 'descending',
        markSelectEnabled: false,
        markTopN: 3,
      },
    },
  ],
  relatedApis: [
    'PlotLineageOptions.markIdentity',
    'PlotLineageOptions.markEncoding',
    'PlotLineageOptions.scaleMappings',
    'PlotLineageOptions.layoutContext',
    'PlotProps.dataTransforms',
    'IRPlotMark.transform',
  ],
} satisfies PreviewControlContract;
