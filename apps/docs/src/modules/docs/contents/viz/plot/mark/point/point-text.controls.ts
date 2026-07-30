import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';

/** 点文字 playground 的稳定控件 id */
export const POINT_TEXT_CONTROL_IDS = {
  coordinate: 'point-text-coordinate',
  mode: 'point-text-mode',
  textColor: 'point-text-color',
  fontSize: 'point-font-size',
  fontBold: 'point-font-bold',
  labelPosition: 'point-label-position',
  labelDistance: 'point-label-distance',
  labelPin: 'point-label-pin',
  dx: 'point-text-dx',
  dy: 'point-text-dy',
} as const;

/** 点文字 playground 的中文属性面板 */
export const pointTextControls = definePreviewControls({
  presentation: 'panel',
  title: '标签与文本点',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'points', label: '点数据', rows: points }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: POINT_TEXT_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
      ],
    },
    {
      label: '显示模式',
      controls: [
        {
          kind: 'select',
          id: POINT_TEXT_CONTROL_IDS.mode,
          label: '文字形态',
          defaultValue: 'label',
          options: [
            { value: 'label', label: '点标签' },
            { value: 'text', label: '文本点' },
          ],
        },
      ],
    },
    {
      label: '文字样式',
      controls: [
        {
          kind: 'color',
          id: POINT_TEXT_CONTROL_IDS.textColor,
          label: '文字颜色',
          defaultValue: '#0f172a',
        },
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.fontSize,
          label: '字号',
          defaultValue: 14,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'switch',
          id: POINT_TEXT_CONTROL_IDS.fontBold,
          label: '粗体',
          defaultValue: false,
        },
      ],
    },
    {
      label: '标签位置',
      visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['label'] },
      controls: [
        {
          kind: 'select',
          id: POINT_TEXT_CONTROL_IDS.labelPosition,
          label: '标签方位',
          defaultValue: 'top',
          options: [
            { value: 'center', label: '居中' },
            { value: 'top', label: '上方' },
            { value: 'top-right', label: '右上角' },
            { value: 'right', label: '右侧' },
            { value: 'bottom-right', label: '右下角' },
            { value: 'bottom', label: '下方' },
            { value: 'bottom-left', label: '左下角' },
            { value: 'left', label: '左侧' },
            { value: 'top-left', label: '左上角' },
          ],
        },
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.labelDistance,
          label: '标签距离',
          defaultValue: 8,
          min: 2,
          max: 24,
          step: 1,
          visibleWhen: {
            controlId: POINT_TEXT_CONTROL_IDS.labelPosition,
            oneOf: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'],
          },
        },
        {
          kind: 'switch',
          id: POINT_TEXT_CONTROL_IDS.labelPin,
          label: '显示引线',
          defaultValue: false,
          visibleWhen: {
            controlId: POINT_TEXT_CONTROL_IDS.labelPosition,
            oneOf: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'],
          },
        },
      ],
    },
    {
      label: '文本点偏移',
      visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['text'] },
      controls: [
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.dx,
          label: '水平偏移',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 1,
        },
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.dy,
          label: '垂直偏移',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 1,
        },
      ],
    },
  ],
});

/** 点文字 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: pointTextControls,
  canonicalValues: {
    [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
    [POINT_TEXT_CONTROL_IDS.mode]: 'label',
    [POINT_TEXT_CONTROL_IDS.textColor]: '#0f172a',
    [POINT_TEXT_CONTROL_IDS.fontSize]: 14,
    [POINT_TEXT_CONTROL_IDS.fontBold]: false,
    [POINT_TEXT_CONTROL_IDS.labelPosition]: 'top',
    [POINT_TEXT_CONTROL_IDS.labelDistance]: 8,
    [POINT_TEXT_CONTROL_IDS.labelPin]: false,
    [POINT_TEXT_CONTROL_IDS.dx]: 0,
    [POINT_TEXT_CONTROL_IDS.dy]: 0,
  },
  presets: [
    {
      id: 'label',
      label: '点标签',
      values: {
        [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_TEXT_CONTROL_IDS.mode]: 'label',
        [POINT_TEXT_CONTROL_IDS.textColor]: '#0f172a',
        [POINT_TEXT_CONTROL_IDS.fontSize]: 14,
        [POINT_TEXT_CONTROL_IDS.fontBold]: false,
        [POINT_TEXT_CONTROL_IDS.labelPosition]: 'top',
        [POINT_TEXT_CONTROL_IDS.labelDistance]: 8,
        [POINT_TEXT_CONTROL_IDS.labelPin]: false,
        [POINT_TEXT_CONTROL_IDS.dx]: 0,
        [POINT_TEXT_CONTROL_IDS.dy]: 0,
      },
    },
    {
      id: 'text',
      label: '文本点',
      values: {
        [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_TEXT_CONTROL_IDS.mode]: 'text',
        [POINT_TEXT_CONTROL_IDS.textColor]: '#7c3aed',
        [POINT_TEXT_CONTROL_IDS.fontSize]: 22,
        [POINT_TEXT_CONTROL_IDS.fontBold]: true,
        [POINT_TEXT_CONTROL_IDS.labelPosition]: 'top',
        [POINT_TEXT_CONTROL_IDS.labelDistance]: 8,
        [POINT_TEXT_CONTROL_IDS.labelPin]: false,
        [POINT_TEXT_CONTROL_IDS.dx]: 0,
        [POINT_TEXT_CONTROL_IDS.dy]: -6,
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'PointMark.label',
    'PointMark.labelTextColor',
    'PointMark.labelFont',
    'PointMark.labelPosition',
    'PointMark.labelDistance',
    'PointMark.labelPin',
    'PointMark.text',
    'PointMark.textColor',
    'PointMark.font',
    'PointMark.dx',
    'PointMark.dy',
  ],
} satisfies PreviewControlContract;
