import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { pointTextI18n } from './point-text.i18n';

/** 点文字 playground 的稳定控件 id */
export const POINT_TEXT_CONTROL_IDS = {
  align: 'point-text-align',
  lineHeight: 'point-text-lineHeight',
  maxTextWidth: 'point-text-maxTextWidth',
  textField: 'point-text-textField',
  displayFormat: 'point-text-displayFormat',
  resolveLabel: 'point-text-resolveLabel',

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
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = pointTextI18n[lang];
  const pointTextControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.labelsAndTextPoints,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [{ kind: 'table', id: 'points', label: i18n.pointRows, rows: points }],
      },
      {
        controls: [
          {
            kind: 'select',
            id: POINT_TEXT_CONTROL_IDS.align,
            label: i18n.align,
            visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['text'] },
            defaultValue: 'middle',
            options: [
              { value: 'start', label: i18n.align0 },
              { value: 'middle', label: i18n.align1 },
              { value: 'end', label: i18n.align2 },
            ],
          },
          {
            kind: 'range',
            id: POINT_TEXT_CONTROL_IDS.lineHeight,
            label: i18n.lineHeight,
            visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['text'] },
            defaultValue: 18,
            min: 12,
            max: 32,
            step: 2,
          },
          {
            kind: 'range',
            id: POINT_TEXT_CONTROL_IDS.maxTextWidth,
            label: i18n.maxTextWidth,
            visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['text'] },
            defaultValue: 70,
            min: 50,
            max: 100,
            step: 5,
          },
          {
            kind: 'select',
            id: POINT_TEXT_CONTROL_IDS.textField,
            label: i18n.textField,
            defaultValue: 'label',
            options: [
              { value: 'label', label: i18n.textField0 },
              { value: 'pop', label: i18n.textField1 },
              { value: 'description', label: i18n.textField2 },
            ],
          },
          {
            kind: 'select',
            id: POINT_TEXT_CONTROL_IDS.displayFormat,
            label: i18n.displayFormat,
            visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.textField, oneOf: ['pop'] },
            defaultValue: '',
            options: [
              { value: '', label: i18n.displayFormat0 },
              { value: '.1f', label: i18n.displayFormat1 },
              { value: ',', label: i18n.displayFormat2 },
            ],
          },
          {
            kind: 'switch',
            id: POINT_TEXT_CONTROL_IDS.resolveLabel,
            label: i18n.resolveLabel,
            visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['label'] },
            defaultValue: false,
          },
        ],
      },
      {
        label: i18n.coordinate,
        controls: [
          {
            kind: 'select',
            id: POINT_TEXT_CONTROL_IDS.coordinate,
            label: i18n.projection,
            defaultValue: 'cartesian2D',
            options: [
              { value: 'cartesian2D', label: i18n.cartesian },
              { value: 'polar2D', label: i18n.polar },
            ],
          },
        ],
      },
      {
        label: i18n.displayMode,
        controls: [
          {
            kind: 'select',
            id: POINT_TEXT_CONTROL_IDS.mode,
            label: i18n.textForm,
            defaultValue: 'label',
            options: [
              { value: 'label', label: i18n.pointLabels },
              { value: 'text', label: i18n.textPoints },
            ],
          },
        ],
      },
      {
        label: i18n.textStyle,
        controls: [
          {
            kind: 'color',
            id: POINT_TEXT_CONTROL_IDS.textColor,
            label: i18n.textColor,
            defaultValue: '#0f172a',
          },
          {
            kind: 'range',
            id: POINT_TEXT_CONTROL_IDS.fontSize,
            label: i18n.fontSize,
            defaultValue: 14,
            min: 10,
            max: 28,
            step: 1,
          },
          {
            kind: 'switch',
            id: POINT_TEXT_CONTROL_IDS.fontBold,
            label: i18n.bold,
            defaultValue: false,
          },
        ],
      },
      {
        label: i18n.labelPosition,
        visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['label'] },
        controls: [
          {
            kind: 'select',
            id: POINT_TEXT_CONTROL_IDS.labelPosition,
            label: i18n.labelPosition2,
            defaultValue: 'top',
            options: [
              { value: 'center', label: i18n.center },
              { value: 'top', label: i18n.top },
              { value: 'top-right', label: i18n.topRight },
              { value: 'right', label: i18n.right },
              { value: 'bottom-right', label: i18n.bottomRight },
              { value: 'bottom', label: i18n.bottom },
              { value: 'bottom-left', label: i18n.bottomLeft },
              { value: 'left', label: i18n.left },
              { value: 'top-left', label: i18n.topLeft },
            ],
          },
          {
            kind: 'range',
            id: POINT_TEXT_CONTROL_IDS.labelDistance,
            label: i18n.labelDistance,
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
            label: i18n.leaderLine,
            defaultValue: false,
            visibleWhen: {
              controlId: POINT_TEXT_CONTROL_IDS.labelPosition,
              oneOf: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'],
            },
          },
        ],
      },
      {
        label: i18n.textPointOffset,
        visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['text'] },
        controls: [
          {
            kind: 'range',
            id: POINT_TEXT_CONTROL_IDS.dx,
            label: i18n.horizontalOffset,
            defaultValue: 0,
            min: -20,
            max: 20,
            step: 1,
          },
          {
            kind: 'range',
            id: POINT_TEXT_CONTROL_IDS.dy,
            label: i18n.verticalOffset,
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
  return {
    controls: pointTextControls,
    canonicalValues: {
      [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
      [POINT_TEXT_CONTROL_IDS.align]: 'middle',
      [POINT_TEXT_CONTROL_IDS.lineHeight]: 18,
      [POINT_TEXT_CONTROL_IDS.maxTextWidth]: 70,
      [POINT_TEXT_CONTROL_IDS.textField]: 'label',
      [POINT_TEXT_CONTROL_IDS.displayFormat]: '',
      [POINT_TEXT_CONTROL_IDS.resolveLabel]: false,

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
    presetSelector: { label: i18n.preset, customLabel: i18n.custom },
    presets: [
      {
        id: 'label',
        label: i18n.pointLabels,
        values: {
          [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_TEXT_CONTROL_IDS.align]: 'middle',
          [POINT_TEXT_CONTROL_IDS.lineHeight]: 18,
          [POINT_TEXT_CONTROL_IDS.maxTextWidth]: 70,
          [POINT_TEXT_CONTROL_IDS.textField]: 'label',
          [POINT_TEXT_CONTROL_IDS.displayFormat]: '',
          [POINT_TEXT_CONTROL_IDS.resolveLabel]: false,

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
        label: i18n.textPoints,
        values: {
          [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_TEXT_CONTROL_IDS.align]: 'middle',
          [POINT_TEXT_CONTROL_IDS.lineHeight]: 18,
          [POINT_TEXT_CONTROL_IDS.maxTextWidth]: 70,
          [POINT_TEXT_CONTROL_IDS.textField]: 'label',
          [POINT_TEXT_CONTROL_IDS.displayFormat]: '',
          [POINT_TEXT_CONTROL_IDS.resolveLabel]: false,

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
      'PointMark.align',
      'PointMark.lineHeight',
      'PointMark.maxTextWidth',
      'PointMark.text',
      'PointMark.displayFormat',
      'PointMark.resolveLabel',

      'Plot.coordinate',
      'PointMark.label',
      'PointMark.label.textColor',
      'PointMark.label.font',
      'PointMark.label.position',
      'PointMark.label.distance',
      'PointMark.label.pin',
      'PointMark.text',
      'PointMark.textColor',
      'PointMark.font',
      'PointMark.dx',
      'PointMark.dy',
    ],
  } satisfies PreviewControlContract;
};

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract();
