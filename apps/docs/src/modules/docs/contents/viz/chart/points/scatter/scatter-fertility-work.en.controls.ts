import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData, WORLD_BANK_FERTILITY_WORK_YEAR } from './scatter-fertility-work.data';
import { createScatterPointControls } from './scatter-point-controls';

/** 分类编码 Scatter 的英文控制面板 */
export const scatterFertilityWorkControls = definePreviewControls({
  presentation: 'panel',
  title: 'Categorical encoding',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${WORLD_BANK_FERTILITY_WORK_YEAR} economy samples`,
          rows: fertilityWorkData,
          columns: [
            { key: 'country', label: 'Economy' },
            { key: 'fertilityRate', label: 'Fertility rate' },
            { key: 'femaleLaborParticipation', label: 'Female labor participation' },
            { key: 'incomeGroup', label: 'Income group' },
          ],
        },
      ],
    },
    {
      label: 'Coordinate',
      controls: [
        createPointCoordinateControl({
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem,
          label: 'Coordinate system',
          cartesianLabel: 'Cartesian',
          polarLabel: 'Polar',
        }),
      ],
    },
    {
      label: 'Encodings',
      controls: [
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory,
          label: 'Differentiate by color',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory,
          label: 'Differentiate by shape',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Points',
      controls: createScatterPointControls({
        ids: SCATTER_FERTILITY_WORK_CONTROL_IDS,
        size: { label: 'Size', defaultValue: 5, min: 3, max: 18, step: 1 },
        stroke: { toggleLabel: 'Stroke', label: 'Stroke color', defaultValue: 'currentColor' },
        opacity: { label: 'Opacity', defaultValue: 0.65, min: 0.3, max: 1, step: 0.05 },
      }),
    },
  ],
});

/** 分类编码 Scatter 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scatterFertilityWorkControls,
  canonicalValues: {
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory]: true,
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory]: true,
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.pointSize]: 5,
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.pointStrokeEnabled]: false,
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.pointStroke]: 'currentColor',
    [SCATTER_FERTILITY_WORK_CONTROL_IDS.pointOpacity]: 0.65,
  },
  relatedApis: [
    'ScatterChart.coordinate',
    'ScatterEncodings.color',
    'ScatterEncodings.shape',
    'ScatterProperties.size',
    'ScatterProperties.stroke',
    'ScatterProperties.opacity',
  ],
} satisfies PreviewControlContract;
