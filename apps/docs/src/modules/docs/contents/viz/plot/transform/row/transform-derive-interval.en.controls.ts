import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { deriveIntervalOperationOf } from './transform-derive-interval.controls';
import { tasks } from './transform-derive-interval.data';

/** 派生区间示例的英文控件 */
export const deriveIntervalControls = definePreviewControls({
  presentation: 'panel',
  title: 'Derive intervals',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Task bounds',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Derived intervals' },
            tasks,
            deriveIntervalOperationOf,
          ),
          columns: [{ key: 'task' }, { key: 'phase' }, { key: 'start' }, { key: 'end' }, { key: 'y0' }, { key: 'y1' }],
        },
      ],
    },
    {
      label: 'Interval source',
      controls: [
        {
          kind: 'select',
          id: 'mode',
          label: 'Mode',
          defaultValue: 'fields',
          options: [
            { value: 'fields', label: 'Explicit fields' },
            { value: 'baseline', label: 'Baseline to end' },
          ],
        },
        {
          kind: 'range',
          id: 'baseline',
          label: 'Baseline',
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

/** 派生区间示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: deriveIntervalControls,
  canonicalValues: { mode: 'fields', baseline: 0 },
  presets: [
    { id: 'fields', label: 'Explicit bounds', values: { mode: 'fields', baseline: 0 } },
    { id: 'baseline', label: 'From baseline', values: { mode: 'baseline', baseline: 0 } },
  ],
  relatedApis: [
    'IRPlotDeriveIntervalTransform.from',
    'IRPlotDeriveIntervalTransform.baseline',
    'IRPlotDeriveIntervalTransform.startFrom',
    'IRPlotDeriveIntervalTransform.endFrom',
  ],
} satisfies PreviewControlContract;
