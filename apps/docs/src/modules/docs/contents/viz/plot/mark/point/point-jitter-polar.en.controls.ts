import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { polarJitterPoints } from './point-jitter.data';
import { POINT_JITTER_POLAR_CONTROL_IDS } from './point-jitter-polar.controls';

/** 极坐标位置散布的英文属性面板 */
export const pointJitterPolarControls = definePreviewControls({
  presentation: 'panel',
  title: 'Polar jitter',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'polarJitterPoints', label: 'Point rows', rows: polarJitterPoints }],
    },
    {
      label: 'Angle scale',
      controls: [
        {
          kind: 'select',
          id: POINT_JITTER_POLAR_CONTROL_IDS.scale,
          label: 'Angle type',
          defaultValue: 'discrete',
          options: [
            { value: 'discrete', label: 'Discrete categories' },
            { value: 'continuous', label: 'Continuous values' },
          ],
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.ratio,
          label: 'Spread width',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: POINT_JITTER_POLAR_CONTROL_IDS.scale, oneOf: ['discrete'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.range,
          label: 'Spread width',
          defaultValue: 48,
          min: 0,
          max: 90,
          step: 2,
          visibleWhen: { controlId: POINT_JITTER_POLAR_CONTROL_IDS.scale, oneOf: ['continuous'] },
        },
        {
          kind: 'select',
          id: POINT_JITTER_POLAR_CONTROL_IDS.distribution,
          label: 'Random distribution',
          defaultValue: 'uniform',
          options: [
            { value: 'uniform', label: 'Uniform (even)' },
            { value: 'normal', label: 'Normal (centered)' },
          ],
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.sigma,
          label: 'Normal sigma',
          defaultValue: 0.5,
          min: 0.1,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: POINT_JITTER_POLAR_CONTROL_IDS.distribution, oneOf: ['normal'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.seed,
          label: 'Random seed',
          defaultValue: 7,
          min: 0,
          max: 100,
          step: 1,
        },
      ],
    },
  ],
});

/** 极坐标位置散布的英文稳定文档契约 */
export const previewControlContract = {
  controls: pointJitterPolarControls,
  canonicalValues: {
    [POINT_JITTER_POLAR_CONTROL_IDS.scale]: 'discrete',
    [POINT_JITTER_POLAR_CONTROL_IDS.ratio]: 0.3,
    [POINT_JITTER_POLAR_CONTROL_IDS.range]: 48,
    [POINT_JITTER_POLAR_CONTROL_IDS.distribution]: 'uniform',
    [POINT_JITTER_POLAR_CONTROL_IDS.sigma]: 0.5,
    [POINT_JITTER_POLAR_CONTROL_IDS.seed]: 7,
  },
  relatedApis: ['PlotScale.type', 'IRPlotJitterPositionAdjustment.span', 'IRPlotJitterPositionAdjustment.distribution'],
} satisfies PreviewControlContract;
