import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { evenSteps, rainfall, squareSteps } from './scale-radial.data';

/** 径向位置比例尺 playground 的中文属性面板 */
export const scaleRadialControls = definePreviewControls({
  presentation: 'panel',
  title: '径向面积对照',
  sections: [
    {
      label: '对比数据',
      controls: [
        {
          kind: 'select',
          id: 'dataPreset',
          label: '数据分布',
          defaultValue: 'square',
          options: [
            { value: 'square', label: '平方级差 1 / 4 / 9 / 16' },
            { value: 'even', label: '等差级数 1 / 2 / 3 / 4' },
            { value: 'rainfall', label: '季度降水量' },
          ],
        },
        {
          kind: 'table',
          id: 'squareSteps',
          label: '平方级差',
          rows: squareSteps,
          columns: [
            { key: 'category', label: '类别' },
            { key: 'value', label: '数值' },
          ],
          visibleWhen: { controlId: 'dataPreset', oneOf: ['square'] },
        },
        {
          kind: 'table',
          id: 'evenSteps',
          label: '等差级数',
          rows: evenSteps,
          columns: [
            { key: 'category', label: '类别' },
            { key: 'value', label: '数值' },
          ],
          visibleWhen: { controlId: 'dataPreset', oneOf: ['even'] },
        },
        {
          kind: 'table',
          id: 'rainfall',
          label: '季度降水量',
          rows: rainfall,
          columns: [
            { key: 'category', label: '季度' },
            { key: 'value', label: '降水量' },
          ],
          visibleWhen: { controlId: 'dataPreset', oneOf: ['rainfall'] },
        },
      ],
    },
  ],
});

/** 径向位置比例尺 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: scaleRadialControls,
  canonicalValues: { dataPreset: 'square' },
  relatedApis: ['PlotScale.type'],
} satisfies PreviewControlContract;
