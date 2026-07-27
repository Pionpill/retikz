import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { tasks } from './transform-derive-interval.data';

/** 派生区间示例的中文控件 */
export const deriveIntervalControls = definePreviewControls({
  presentation: 'panel',
  title: '派生区间',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '任务起止值',
          rows: tasks,
          columns: [
            { key: 'task', label: '任务' },
            { key: 'phase', label: '阶段' },
            { key: 'start', label: '起点' },
            { key: 'end', label: '终点' },
          ],
        },
      ],
    },
    {
      label: '区间来源',
      controls: [
        {
          kind: 'select',
          id: 'mode',
          label: '模式',
          defaultValue: 'fields',
          options: [
            { value: 'fields', label: '显式起止字段' },
            { value: 'baseline', label: '基线到终点' },
          ],
        },
        {
          kind: 'range',
          id: 'baseline',
          label: '基线',
          defaultValue: 0,
          min: 0,
          max: 6,
          step: 1,
          visibleWhen: { controlId: 'mode', oneOf: ['baseline'] },
        },
      ],
    },
  ],
});

/** 派生区间示例的稳定文档契约 */
export const previewControlContract = {
  controls: deriveIntervalControls,
  canonicalValues: { mode: 'fields', baseline: 0 },
  presets: [
    { id: 'fields', label: '显式起止', values: { mode: 'fields', baseline: 0 } },
    { id: 'baseline', label: '从基线开始', values: { mode: 'baseline', baseline: 0 } },
  ],
  relatedApis: [
    'IRPlotDeriveIntervalTransform.from',
    'IRPlotDeriveIntervalTransform.baseline',
    'IRPlotDeriveIntervalTransform.startFrom',
    'IRPlotDeriveIntervalTransform.endFrom',
  ],
} satisfies PreviewControlContract;
