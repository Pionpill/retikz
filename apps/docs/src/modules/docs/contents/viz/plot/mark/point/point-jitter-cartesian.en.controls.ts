import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { jitterPoints } from './point-jitter.data';
import { POINT_JITTER_CARTESIAN_CONTROL_IDS } from './point-jitter-cartesian.controls';

/** 直角坐标位置散布的英文属性面板 */
export const pointJitterCartesianControls = definePreviewControls({
  presentation: 'panel',
  title: 'Cartesian jitter',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'jitterPoints', label: 'Point rows', rows: jitterPoints }],
    },
    {
      label: 'Jitter parameters',
      controls: [
        {
          kind: 'select',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind,
          label: 'Width unit',
          defaultValue: 'ratio',
          options: [
            { value: 'ratio', label: 'Step ratio' },
            { value: 'range', label: 'Output units' },
          ],
        },
        {
          kind: 'range',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio,
          label: 'Spread width',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind, oneOf: ['ratio'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.range,
          label: 'Spread width',
          defaultValue: 80,
          min: 0,
          max: 120,
          step: 5,
          visibleWhen: { controlId: POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind, oneOf: ['range'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.seed,
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

/** 直角坐标位置散布的英文稳定文档契约 */
export const previewControlContract = {
  controls: pointJitterCartesianControls,
  canonicalValues: {
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind]: 'ratio',
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio]: 0.3,
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.range]: 80,
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.seed]: 7,
  },
  presets: [
    {
      id: 'compact',
      label: 'Compact spread',
      values: {
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind]: 'ratio',
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio]: 0.35,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.range]: 80,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.seed]: 7,
      },
    },
    {
      id: 'full-step',
      label: 'Full step',
      values: {
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind]: 'ratio',
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio]: 1,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.range]: 80,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.seed]: 7,
      },
    },
  ],
  relatedApis: ['IRPlotJitterPositionAdjustment.span', 'IRPlotJitterPositionAdjustment.seed'],
} satisfies PreviewControlContract;
