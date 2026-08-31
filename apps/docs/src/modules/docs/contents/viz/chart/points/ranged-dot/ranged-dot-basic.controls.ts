import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { rangedDotData } from './ranged-dot-basic.data';

export const RANGED_DOT_CONTROL_IDS = {
  coordinateSystem: 'ranged-dot-coordinate-system',
  lineStyle: 'ranged-dot-line-style',
  lineColor: 'ranged-dot-line-color',
  strokeWidth: 'ranged-dot-stroke-width',
  pointSize: 'ranged-dot-point-size',
  startColor: 'ranged-dot-start-color',
  endColor: 'ranged-dot-end-color',
} as const;

export const rangedDotBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '范围与端点',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'World Bank 国家对比',
          rows: rangedDotData,
          columns: [
            { key: 'country', label: '国家' },
            { key: 'forestArea2000', label: '2000 年（%）' },
            { key: 'forestArea2022', label: '2022 年（%）' },
          ],
        },
      ],
    },
    {
      label: '坐标',
      controls: [
        createPointCoordinateControl({
          id: RANGED_DOT_CONTROL_IDS.coordinateSystem,
          label: '坐标系',
          cartesianLabel: '笛卡尔',
          polarLabel: '极坐标',
        }),
      ],
    },
    {
      label: '连接范围',
      controls: [
        {
          kind: 'select',
          id: RANGED_DOT_CONTROL_IDS.lineStyle,
          label: '线型',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
          ],
        },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.lineColor, label: '连接线颜色', defaultValue: '#94a3b8' },
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.strokeWidth,
          label: '线宽',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
      ],
    },
    {
      label: '端点',
      controls: [
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.pointSize,
          label: '半径',
          defaultValue: 5,
          min: 2,
          max: 10,
          step: 1,
        },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.startColor, label: '起点颜色', defaultValue: '#2563eb' },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.endColor, label: '终点颜色', defaultValue: '#f97316' },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: rangedDotBasicControls,
  canonicalValues: {
    [RANGED_DOT_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [RANGED_DOT_CONTROL_IDS.lineStyle]: 'solid',
    [RANGED_DOT_CONTROL_IDS.lineColor]: '#94a3b8',
    [RANGED_DOT_CONTROL_IDS.strokeWidth]: 2,
    [RANGED_DOT_CONTROL_IDS.pointSize]: 5,
    [RANGED_DOT_CONTROL_IDS.startColor]: '#2563eb',
    [RANGED_DOT_CONTROL_IDS.endColor]: '#f97316',
  },
  relatedApis: [
    'ChartExtension.coordinate',
    'RangedDotProperties.range',
    'RangedDotProperties.point',
    'RangedDotProperties.startPoint',
    'RangedDotProperties.endPoint',
  ],
} satisfies PreviewControlContract;
