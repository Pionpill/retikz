import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { segments } from './scale-band.data';

/** 分类位置比例尺 playground 的英文属性面板 */
export const scaleBandControls = definePreviewControls({
  presentation: 'panel',
  title: 'Categorical positional scale',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'segments',
          label: 'Plan revenue',
          rows: segments,
          columns: [{ key: 'segment' }, { key: 'revenue' }],
        },
      ],
    },
    {
      label: 'Categorical placement',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: 'Scale type',
          defaultValue: 'band',
          options: [
            { value: 'band', label: 'Equal-width bands' },
            { value: 'point', label: 'Evenly-spaced points' },
          ],
        },
        {
          kind: 'range',
          id: 'paddingInner',
          label: 'Inner padding',
          defaultValue: 0.1,
          min: 0,
          max: 0.8,
          step: 0.05,
          visibleWhen: { controlId: 'scaleType', oneOf: ['band'] },
        },
        {
          kind: 'range',
          id: 'paddingOuter',
          label: 'Outer padding',
          defaultValue: 0.05,
          min: 0,
          max: 0.5,
          step: 0.05,
          visibleWhen: { controlId: 'scaleType', oneOf: ['band'] },
        },
        {
          kind: 'range',
          id: 'padding',
          label: 'Endpoint padding',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: 'scaleType', oneOf: ['point'] },
        },
      ],
    },
  ],
});

/** 分类位置比例尺 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scaleBandControls,
  canonicalValues: {
    scaleType: 'band',
    paddingInner: 0.1,
    paddingOuter: 0.05,
    padding: 0.5,
  },
  relatedApis: ['IRPlotBandScale.paddingInner', 'IRPlotBandScale.paddingOuter', 'IRPlotPointScale.padding'],
} satisfies PreviewControlContract;
