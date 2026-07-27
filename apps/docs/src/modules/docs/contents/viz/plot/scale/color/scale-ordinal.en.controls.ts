import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { climate } from './scale-ordinal.data';

/** Ordinal 颜色比例尺 playground 的英文属性面板 */
export const scaleOrdinalControls = definePreviewControls({
  presentation: 'panel',
  title: 'Categorical color scale',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'climate',
          label: 'City temperatures',
          rows: climate,
          columns: [{ key: 'city' }, { key: 'month' }, { key: 'temp' }],
        },
      ],
    },
    {
      label: 'Categorical color',
      controls: [
        {
          kind: 'select',
          id: 'palette',
          label: 'Discrete palette',
          defaultValue: 'default',
          options: [
            { value: 'default', label: 'Default blue and orange' },
            { value: 'cool', label: 'Cool blue and violet' },
            { value: 'warm', label: 'Warm red and yellow' },
          ],
        },
        { kind: 'switch', id: 'showLegend', label: 'Show legend', defaultValue: true },
      ],
    },
  ],
});

/** Ordinal 颜色比例尺 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scaleOrdinalControls,
  canonicalValues: { palette: 'default', showLegend: true },
  relatedApis: ['Plot.colors', 'Legend.channel'],
} satisfies PreviewControlContract;
