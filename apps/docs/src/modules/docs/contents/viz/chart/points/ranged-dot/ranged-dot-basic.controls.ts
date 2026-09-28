const extraText = extraControlI18n.zh;
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { rangedDotData } from './ranged-dot-basic.data';
import { extraControlI18n } from './ranged-dot-basic.i18n';

export const RANGED_DOT_CONTROL_IDS = {
  coordinateSystem: 'ranged-dot-coordinate-system',
  customEndpoints: 'ranged-dot-custom-endpoints',
  pointShape: 'ranged-dot-basic-pointShape',
  pointOpacity: 'ranged-dot-basic-pointOpacity',
  startSize: 'ranged-dot-basic-startSize',
  endSize: 'ranged-dot-basic-endSize',
  endShape: 'ranged-dot-basic-endShape',

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
          columns: [{ key: 'country' }, { key: 'forestArea2000' }, { key: 'forestArea2022' }],
        },
      ],
    },

    createPointCoordinateSection(RANGED_DOT_CONTROL_IDS.coordinateSystem, 'zh'),
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
          visibleWhen: { controlId: RANGED_DOT_CONTROL_IDS.customEndpoints, oneOf: [false] },
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

    {
      label: extraText.appearance,
      controls: [
        { kind: 'switch', id: RANGED_DOT_CONTROL_IDS.customEndpoints, label: '单独设置端点', defaultValue: false },
        {
          kind: 'select',
          id: RANGED_DOT_CONTROL_IDS.pointShape,
          label: extraText.pointShape,
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: extraText.pointShape_circle },
            { value: 'diamond', label: extraText.pointShape_diamond },
            { value: 'rectangle', label: extraText.pointShape_rectangle },
          ],
        },
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.pointOpacity,
          label: extraText.pointOpacity,
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.startSize,
          visibleWhen: { controlId: RANGED_DOT_CONTROL_IDS.customEndpoints, oneOf: [true] },
          label: extraText.startSize,
          defaultValue: 5,
          min: 1,
          max: 12,
          step: 1,
        },
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.endSize,
          visibleWhen: { controlId: RANGED_DOT_CONTROL_IDS.customEndpoints, oneOf: [true] },
          label: extraText.endSize,
          defaultValue: 5,
          min: 1,
          max: 12,
          step: 1,
        },
        {
          kind: 'select',
          id: RANGED_DOT_CONTROL_IDS.endShape,
          visibleWhen: { controlId: RANGED_DOT_CONTROL_IDS.customEndpoints, oneOf: [true] },
          label: extraText.endShape,
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: extraText.endShape_circle },
            { value: 'diamond', label: extraText.endShape_diamond },
            { value: 'rectangle', label: extraText.endShape_rectangle },
          ],
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: rangedDotBasicControls,
  canonicalValues: {
    [RANGED_DOT_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [RANGED_DOT_CONTROL_IDS.customEndpoints]: false,
    [RANGED_DOT_CONTROL_IDS.pointShape]: 'circle',
    [RANGED_DOT_CONTROL_IDS.pointOpacity]: 1,
    [RANGED_DOT_CONTROL_IDS.startSize]: 5,
    [RANGED_DOT_CONTROL_IDS.endSize]: 5,
    [RANGED_DOT_CONTROL_IDS.endShape]: 'circle',

    [RANGED_DOT_CONTROL_IDS.lineStyle]: 'solid',
    [RANGED_DOT_CONTROL_IDS.lineColor]: '#94a3b8',
    [RANGED_DOT_CONTROL_IDS.strokeWidth]: 2,
    [RANGED_DOT_CONTROL_IDS.pointSize]: 5,
    [RANGED_DOT_CONTROL_IDS.startColor]: '#2563eb',
    [RANGED_DOT_CONTROL_IDS.endColor]: '#f97316',
  },
  relatedApis: [
    'RangedDotChart.coordinate',
    'RangedDotProperties.range',
    'RangedDotProperties.point',
    'RangedDotProperties.startPoint',
    'RangedDotProperties.endPoint',
  ],
} satisfies PreviewControlContract;
