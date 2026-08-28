import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { countryScatterData, WORLD_BANK_SCATTER_YEAR } from './scatter-basic.data';
import { createScatterPointControls } from './scatter-point-controls';

/** 基础 Scatter 的英文控制面板 */
export const scatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Basic scatter',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${WORLD_BANK_SCATTER_YEAR} country samples`,
          rows: countryScatterData,
          columns: [
            { key: 'country', label: 'Country or economy' },
            { key: 'urbanPopulationShare', label: 'Urban population' },
            { key: 'internetUseShare', label: 'Internet use' },
          ],
        },
      ],
    },
    {
      label: 'Points',
      controls: createScatterPointControls({
        ids: SCATTER_BASIC_CONTROL_IDS,
        size: { label: 'Size', defaultValue: 5, min: 3, max: 18, step: 1 },
        fill: { toggleLabel: 'Fill', label: 'Fill color', defaultValue: 'currentColor' },
        stroke: { toggleLabel: 'Stroke', label: 'Stroke color', defaultValue: 'currentColor' },
        shape: {
          label: 'Shape',
          defaultValue: 'circle',
          labels: { circle: 'Circle', rectangle: 'Rectangle', ellipse: 'Ellipse', diamond: 'Diamond' },
        },
        opacity: { label: 'Opacity', defaultValue: 0.82, min: 0.4, max: 1, step: 0.02 },
      }),
    },
  ],
});

/** 基础 Scatter 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scatterBasicControls,
  canonicalValues: {
    [SCATTER_BASIC_CONTROL_IDS.pointSize]: 5,
    [SCATTER_BASIC_CONTROL_IDS.pointFillEnabled]: false,
    [SCATTER_BASIC_CONTROL_IDS.pointFill]: 'currentColor',
    [SCATTER_BASIC_CONTROL_IDS.pointStrokeEnabled]: false,
    [SCATTER_BASIC_CONTROL_IDS.pointStroke]: 'currentColor',
    [SCATTER_BASIC_CONTROL_IDS.pointShape]: 'circle',
    [SCATTER_BASIC_CONTROL_IDS.pointOpacity]: 0.82,
  },
  relatedApis: [
    'ScatterEncodings.x',
    'ScatterEncodings.y',
    'ScatterProperties.size',
    'ScatterProperties.fill',
    'ScatterProperties.stroke',
    'ScatterProperties.shape',
    'ScatterProperties.opacity',
  ],
} satisfies PreviewControlContract;
