import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { evenSteps, rainfall, squareSteps } from './scale-radial.data';

/** 径向位置比例尺 playground 的英文属性面板 */
export const scaleRadialControls = definePreviewControls({
  presentation: 'panel',
  title: 'Radial area comparison',
  sections: [
    {
      label: 'Comparison data',
      controls: [
        {
          kind: 'select',
          id: 'dataPreset',
          label: 'Data distribution',
          defaultValue: 'square',
          options: [
            { value: 'square', label: 'Square steps 1 / 4 / 9 / 16' },
            { value: 'even', label: 'Even steps 1 / 2 / 3 / 4' },
            { value: 'rainfall', label: 'Seasonal rainfall' },
          ],
        },
        {
          kind: 'table',
          id: 'squareSteps',
          label: 'Square steps',
          rows: squareSteps,
          columns: [{ key: 'category' }, { key: 'value' }],
          visibleWhen: { controlId: 'dataPreset', oneOf: ['square'] },
        },
        {
          kind: 'table',
          id: 'evenSteps',
          label: 'Even steps',
          rows: evenSteps,
          columns: [{ key: 'category' }, { key: 'value' }],
          visibleWhen: { controlId: 'dataPreset', oneOf: ['even'] },
        },
        {
          kind: 'table',
          id: 'rainfall',
          label: 'Seasonal rainfall',
          rows: rainfall,
          columns: [{ key: 'category' }, { key: 'value' }],
          visibleWhen: { controlId: 'dataPreset', oneOf: ['rainfall'] },
        },
      ],
    },
  ],
});

/** 径向位置比例尺 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scaleRadialControls,
  canonicalValues: { dataPreset: 'square' },
  relatedApis: ['PlotScale.type'],
} satisfies PreviewControlContract;
