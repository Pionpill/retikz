import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { colorValues } from './scale-continuous.data';

/** 连续颜色比例尺 playground 的中文属性面板 */
export const scaleContinuousControls = definePreviewControls({
  presentation: 'panel',
  title: '连续颜色比例尺',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'values',
          label: '变化量',
          rows: colorValues,
          columns: [{ key: 'x' }, { key: 'y' }, { key: 'value' }],
        },
      ],
    },
    {
      label: '颜色映射',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: '比例尺类型',
          defaultValue: 'sequential',
          options: [
            { value: 'sequential', label: '连续 sequential' },
            { value: 'diverging', label: '发散 diverging' },
          ],
        },
        {
          kind: 'select',
          id: 'sequentialScheme',
          label: '连续色带',
          defaultValue: 'viridis',
          options: [
            { value: 'viridis', label: 'Viridis' },
            { value: 'blues', label: '蓝色 Blues' },
            { value: 'greens', label: '绿色 Greens' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['sequential'] },
        },
        {
          kind: 'select',
          id: 'divergingScheme',
          label: '发散色带',
          defaultValue: 'rdbu',
          options: [
            { value: 'rdbu', label: '红蓝 RdBu' },
            { value: 'brbg', label: '棕绿 BrBG' },
            { value: 'spectral', label: '光谱 Spectral' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['diverging'] },
        },
        {
          kind: 'range',
          id: 'midpoint',
          label: '视觉中点',
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

/** 连续颜色比例尺 playground 的稳定文档契约 */
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
      label: '连续低到高',
      values: {
        scaleType: 'sequential',
        sequentialScheme: 'viridis',
        divergingScheme: 'rdbu',
        midpoint: 0,
      },
    },
    {
      id: 'diverging',
      label: '围绕中点发散',
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
