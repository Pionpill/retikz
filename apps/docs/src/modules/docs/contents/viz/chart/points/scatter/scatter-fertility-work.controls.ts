import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { fertilityWorkData, WORLD_BANK_FERTILITY_WORK_YEAR } from './scatter-fertility-work.data';
import { createScatterPointControls } from './scatter-point-controls';

/** 分类编码 Scatter 的稳定控件 id */
export const SCATTER_FERTILITY_WORK_CONTROL_IDS = {
  coordinateSystem: 'scatter-fertility-work-coordinate-system',
  colorByCategory: 'scatter-fertility-work-color-by-category',
  shapeByCategory: 'scatter-fertility-work-shape-by-category',
  pointSize: 'scatter-fertility-work-point-size',
  pointFillEnabled: 'scatter-fertility-work-point-fill-enabled',
  pointFill: 'scatter-fertility-work-point-fill',
  pointStrokeEnabled: 'scatter-fertility-work-point-stroke-enabled',
  pointStroke: 'scatter-fertility-work-point-stroke',
  pointShape: 'scatter-fertility-work-point-shape',
  pointOpacity: 'scatter-fertility-work-point-opacity',
} as const;

/** 分类编码 Scatter 的中文控制面板 */
export const scatterFertilityWorkControls = definePreviewControls({
  presentation: 'panel',
  title: '分类编码',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${WORLD_BANK_FERTILITY_WORK_YEAR} 年经济体样本`,
          rows: fertilityWorkData,
          columns: [
            { key: 'country' },
            { key: 'fertilityRate' },
            { key: 'femaleLaborParticipation' },
            { key: 'incomeGroup' },
          ],
        },
      ],
    },
    {
      label: '坐标',
      controls: [
        createPointCoordinateControl({
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem,
          label: '坐标系',
          cartesianLabel: '笛卡尔',
          polarLabel: '极坐标',
        }),
      ],
    },
    {
      label: '编码',
      controls: [
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory,
          label: '按分类区分颜色',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory,
          label: '按分类区分形状',
          defaultValue: true,
        },
      ],
    },
    {
      label: '散点',
      controls: createScatterPointControls({
        ids: SCATTER_FERTILITY_WORK_CONTROL_IDS,
        size: { label: '大小', defaultValue: 5, min: 3, max: 18, step: 1 },
        stroke: { toggleLabel: '描边', label: '描边色', defaultValue: 'currentColor' },
        opacity: { label: '不透明度', defaultValue: 0.65, min: 0.3, max: 1, step: 0.05 },
      }),
    },
  ],
});

/** 分类编码 Scatter 的稳定文档契约 */
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
