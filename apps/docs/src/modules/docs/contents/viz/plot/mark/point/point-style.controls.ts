import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';

/** 点外观 playground 的稳定控件 id */
export const POINT_STYLE_CONTROL_IDS = {
  paintMode: 'point-paint-mode',
  fill: 'point-fill',
  stroke: 'point-stroke',
  strokeWidth: 'point-stroke-width',
  opacity: 'point-opacity',
  size: 'point-size',
  shape: 'point-shape',
} as const;

/** 点通道与 paint 的中文属性面板 */
export const pointStyleControls = definePreviewControls({
  presentation: 'panel',
  title: '点外观',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'points', label: '点数据', rows: points }],
    },
    {
      label: 'Paint 与形状',
      controls: [
        {
          kind: 'select',
          id: POINT_STYLE_CONTROL_IDS.paintMode,
          label: '颜色来源',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '地区字段' },
            { value: 'solid', label: '固定颜色' },
            { value: 'gradient', label: '渐变填充' },
          ],
        },
        {
          kind: 'color',
          id: POINT_STYLE_CONTROL_IDS.fill,
          label: '填充色',
          defaultValue: '#38bdf8',
          visibleWhen: { controlId: POINT_STYLE_CONTROL_IDS.paintMode, oneOf: ['solid'] },
        },
        { kind: 'color', id: POINT_STYLE_CONTROL_IDS.stroke, label: '描边色', defaultValue: '#0f172a' },
        {
          kind: 'range',
          id: POINT_STYLE_CONTROL_IDS.strokeWidth,
          label: '描边宽度',
          defaultValue: 2,
          min: 0,
          max: 6,
          step: 0.5,
        },
        {
          kind: 'range',
          id: POINT_STYLE_CONTROL_IDS.opacity,
          label: '透明度',
          defaultValue: 0.85,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: POINT_STYLE_CONTROL_IDS.size,
          label: '点尺寸',
          defaultValue: 14,
          min: 6,
          max: 28,
          step: 1,
        },
        {
          kind: 'select',
          id: POINT_STYLE_CONTROL_IDS.shape,
          label: '形状',
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: '圆形' },
            { value: 'rectangle', label: '矩形' },
            { value: 'diamond', label: '菱形' },
          ],
        },
      ],
    },
  ],
});

/** 点外观 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: pointStyleControls,
  canonicalValues: {
    [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
    [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
    [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
    [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
    [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
    [POINT_STYLE_CONTROL_IDS.size]: 14,
    [POINT_STYLE_CONTROL_IDS.shape]: 'circle',
  },
  presets: [
    {
      id: 'field',
      label: '字段编码',
      values: {
        [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
        [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
        [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
        [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
        [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
        [POINT_STYLE_CONTROL_IDS.size]: 14,
        [POINT_STYLE_CONTROL_IDS.shape]: 'circle',
      },
    },
    {
      id: 'gradient',
      label: '渐变强调',
      values: {
        [POINT_STYLE_CONTROL_IDS.paintMode]: 'gradient',
        [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
        [POINT_STYLE_CONTROL_IDS.stroke]: '#f97316',
        [POINT_STYLE_CONTROL_IDS.strokeWidth]: 3,
        [POINT_STYLE_CONTROL_IDS.opacity]: 0.95,
        [POINT_STYLE_CONTROL_IDS.size]: 18,
        [POINT_STYLE_CONTROL_IDS.shape]: 'diamond',
      },
    },
  ],
  relatedApis: [
    'PointMark.color',
    'PointMark.fill',
    'PointMark.stroke',
    'PointMark.strokeWidth',
    'PointMark.opacity',
    'PointMark.size',
    'PointMark.shape',
  ],
} satisfies PreviewControlContract;
