import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { colorValues } from './scale-continuous.data';

/** 连续颜色比例尺 playground 的英文属性面板 */
export const scaleContinuousControls = definePreviewControls({
  presentation: 'panel',
  title: 'Continuous color scales',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'values',
          label: 'Change values',
          rows: colorValues,
          columns: [{ key: 'x' }, { key: 'y' }, { key: 'value' }],
        },
      ],
    },
    {
      label: 'Color mapping',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: 'Scale type',
          defaultValue: 'sequential',
          options: [
            { value: 'sequential', label: 'Sequential' },
            { value: 'diverging', label: 'Diverging' },
          ],
        },
        {
          kind: 'select',
          id: 'sequentialScheme',
          label: 'Sequential scheme',
          defaultValue: 'viridis',
          options: [
            { value: 'viridis', label: 'Viridis' },
            { value: 'blues', label: 'Blues' },
            { value: 'greens', label: 'Greens' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['sequential'] },
        },
        {
          kind: 'select',
          id: 'divergingScheme',
          label: 'Diverging scheme',
          defaultValue: 'rdbu',
          options: [
            { value: 'rdbu', label: 'RdBu' },
            { value: 'brbg', label: 'BrBG' },
            { value: 'spectral', label: 'Spectral' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['diverging'] },
        },
        {
          kind: 'range',
          id: 'midpoint',
          label: 'Visual midpoint',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 1,
          visibleWhen: { controlId: 'scaleType', oneOf: ['diverging'] },
        },
      ],
    },
  ],
});

/** 连续颜色比例尺 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scaleContinuousControls,
  canonicalValues: {
    scaleType: 'sequential',
    sequentialScheme: 'viridis',
    divergingScheme: 'rdbu',
    midpoint: 0,
  },
  presets: [
    {
      id: 'sequential',
      label: 'Continuous low to high',
      values: {
        scaleType: 'sequential',
        sequentialScheme: 'viridis',
        divergingScheme: 'rdbu',
        midpoint: 0,
      },
    },
    {
      id: 'diverging',
      label: 'Diverge around a center',
      values: {
        scaleType: 'diverging',
        sequentialScheme: 'viridis',
        divergingScheme: 'rdbu',
        midpoint: 0,
      },
    },
  ],
  relatedApis: [
    'IRPlotSequentialColorScale.scheme',
    'IRPlotDivergingColorScale.domain',
    'IRPlotDivergingColorScale.scheme',
  ],
} satisfies PreviewControlContract;
