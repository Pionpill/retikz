import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { stylePoints } from './point-api.data';
import { pointStyleI18n } from './point-style.i18n';

/** 点外观 playground 的稳定控件 id */
export const POINT_STYLE_CONTROL_IDS = {
  dashOffset: 'point-style-dash-offset',
  lineCap: 'point-style-line-cap',
  lineJoin: 'point-style-line-join',
  shape: 'point-style-shape',
  weight: 'point-style-weight',
  scalarOpacity: 'point-style-scalar-opacity',
  dotted: 'point-style-dotted',
  dashPattern: 'point-style-dashPattern',
  blendMode: 'point-style-blendMode',
  zIndex: 'point-style-zIndex',

  coordinate: 'point-style-coordinate',
  paintMode: 'point-paint-mode',
  fill: 'point-fill',
  stroke: 'point-stroke',
  strokeWidth: 'point-stroke-width',
  fillOpacity: 'point-fill-opacity',
  strokeOpacity: 'point-stroke-opacity',
  opacity: 'point-opacity',
  size: 'point-size',
  dashed: 'point-dashed',
  shadow: 'point-shadow',
} as const;

/** 点填充与样式的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = pointStyleI18n[lang];
  const pointStyleControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.pointAppearance,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [{ kind: 'table', id: 'points', label: i18n.pointRows, rows: stylePoints }],
      },
      {
        controls: [
          {
            kind: 'range',
            id: POINT_STYLE_CONTROL_IDS.dashOffset,
            label: i18n.dashOffset,
            defaultValue: 0,
            min: -12,
            max: 12,
            step: 1,
          },
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.lineCap,
            label: i18n.lineCap,
            defaultValue: 'butt',
            options: [
              { value: 'butt', label: i18n.butt },
              { value: 'round', label: i18n.round },
              { value: 'square', label: i18n.square },
            ],
          },
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.lineJoin,
            label: i18n.lineJoin,
            defaultValue: 'miter',
            options: [
              { value: 'miter', label: i18n.miter },
              { value: 'round', label: i18n.round },
              { value: 'bevel', label: i18n.bevel },
            ],
          },
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.shape,
            label: i18n.shape,
            defaultValue: 'circle',
            options: [
              { value: 'circle', label: i18n.circle },
              { value: 'rectangle', label: i18n.rectangle },
            ],
          },
          {
            kind: 'range',
            id: POINT_STYLE_CONTROL_IDS.weight,
            label: i18n.weight,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
            visibleWhen: { controlId: POINT_STYLE_CONTROL_IDS.paintMode, oneOf: ['weight'] },
          },
          { kind: 'switch', id: POINT_STYLE_CONTROL_IDS.scalarOpacity, label: i18n.scalarOpacity, defaultValue: false },
          { kind: 'switch', id: POINT_STYLE_CONTROL_IDS.dotted, label: i18n.dotted, defaultValue: false },
          { kind: 'switch', id: POINT_STYLE_CONTROL_IDS.dashPattern, label: i18n.dashPattern, defaultValue: false },
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.blendMode,
            label: i18n.blendMode,
            defaultValue: 'normal',
            options: [
              { value: 'normal', label: i18n.blendMode0 },
              { value: 'multiply', label: i18n.blendMode1 },
              { value: 'screen', label: i18n.blendMode2 },
            ],
          },
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.zIndex,
            label: i18n.zIndex,
            defaultValue: 'order',
            options: [
              { value: 'order', label: i18n.forwardOrder },
              { value: 'reverseOrder', label: i18n.reverseOrder },
            ],
          },
        ],
      },
      {
        label: i18n.coordinate,
        controls: [
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.coordinate,
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
        label: i18n.paintAndStyle,
        controls: [
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.paintMode,
            label: i18n.colorSource,
            defaultValue: 'field',
            options: [
              { value: 'field', label: i18n.regionField },
              { value: 'solid', label: i18n.solidColor },
              { value: 'gradient', label: i18n.gradientFill },
              { value: 'weight', label: i18n.weight },
            ],
          },
          {
            kind: 'color',
            id: POINT_STYLE_CONTROL_IDS.fill,
            label: i18n.fill,
            defaultValue: '#38bdf8',
            visibleWhen: { controlId: POINT_STYLE_CONTROL_IDS.paintMode, oneOf: ['solid'] },
          },
          { kind: 'color', id: POINT_STYLE_CONTROL_IDS.stroke, label: i18n.stroke, defaultValue: '#0f172a' },
          {
            kind: 'range',
            id: POINT_STYLE_CONTROL_IDS.strokeWidth,
            label: i18n.strokeWidth,
            defaultValue: 2,
            min: 0,
            max: 6,
            step: 0.5,
          },
          {
            kind: 'range',
            id: POINT_STYLE_CONTROL_IDS.fillOpacity,
            visibleWhen: { controlId: POINT_STYLE_CONTROL_IDS.scalarOpacity, oneOf: [false] },
            label: i18n.fillOpacity,
            defaultValue: 1,
            min: 0.15,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'range',
            id: POINT_STYLE_CONTROL_IDS.strokeOpacity,
            visibleWhen: { controlId: POINT_STYLE_CONTROL_IDS.scalarOpacity, oneOf: [false] },
            label: i18n.strokeOpacity,
            defaultValue: 1,
            min: 0.15,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'range',
            id: POINT_STYLE_CONTROL_IDS.opacity,
            label: i18n.opacity,
            defaultValue: 0.85,
            min: 0.2,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'range',
            id: POINT_STYLE_CONTROL_IDS.size,
            label: i18n.pointSize,
            defaultValue: 14,
            min: 6,
            max: 28,
            step: 1,
          },
          {
            kind: 'switch',
            id: POINT_STYLE_CONTROL_IDS.dashed,
            label: i18n.dashedStroke,
            defaultValue: false,
          },
          {
            kind: 'select',
            id: POINT_STYLE_CONTROL_IDS.shadow,
            label: i18n.shadow,
            defaultValue: 'none',
            options: [
              { value: 'none', label: i18n.none },
              { value: 'md', label: i18n.medium },
              { value: 'xl', label: i18n.strong },
            ],
          },
        ],
      },
    ],
  });

  /** 点外观 playground 的稳定文档契约 */
  return {
    controls: pointStyleControls,
    canonicalValues: {
      [POINT_STYLE_CONTROL_IDS.coordinate]: 'cartesian2D',
      [POINT_STYLE_CONTROL_IDS.dashOffset]: 0,
      [POINT_STYLE_CONTROL_IDS.lineCap]: 'butt',
      [POINT_STYLE_CONTROL_IDS.lineJoin]: 'miter',
      [POINT_STYLE_CONTROL_IDS.shape]: 'circle',
      [POINT_STYLE_CONTROL_IDS.weight]: 0.5,
      [POINT_STYLE_CONTROL_IDS.scalarOpacity]: false,
      [POINT_STYLE_CONTROL_IDS.dotted]: false,
      [POINT_STYLE_CONTROL_IDS.dashPattern]: false,
      [POINT_STYLE_CONTROL_IDS.blendMode]: 'normal',
      [POINT_STYLE_CONTROL_IDS.zIndex]: 'order',

      [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
      [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
      [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
      [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
      [POINT_STYLE_CONTROL_IDS.fillOpacity]: 1,
      [POINT_STYLE_CONTROL_IDS.strokeOpacity]: 1,
      [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
      [POINT_STYLE_CONTROL_IDS.size]: 14,
      [POINT_STYLE_CONTROL_IDS.dashed]: false,
      [POINT_STYLE_CONTROL_IDS.shadow]: 'none',
    },
    presetSelector: { label: i18n.preset, customLabel: i18n.custom },
    presets: [
      {
        id: 'field',
        label: i18n.fieldEncoding,
        values: {
          [POINT_STYLE_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_STYLE_CONTROL_IDS.dashOffset]: 0,
          [POINT_STYLE_CONTROL_IDS.lineCap]: 'butt',
          [POINT_STYLE_CONTROL_IDS.lineJoin]: 'miter',
          [POINT_STYLE_CONTROL_IDS.shape]: 'circle',
          [POINT_STYLE_CONTROL_IDS.weight]: 0.5,
          [POINT_STYLE_CONTROL_IDS.scalarOpacity]: false,
          [POINT_STYLE_CONTROL_IDS.dotted]: false,
          [POINT_STYLE_CONTROL_IDS.dashPattern]: false,
          [POINT_STYLE_CONTROL_IDS.blendMode]: 'normal',
          [POINT_STYLE_CONTROL_IDS.zIndex]: 'order',

          [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
          [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
          [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
          [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
          [POINT_STYLE_CONTROL_IDS.fillOpacity]: 1,
          [POINT_STYLE_CONTROL_IDS.strokeOpacity]: 1,
          [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
          [POINT_STYLE_CONTROL_IDS.size]: 14,
          [POINT_STYLE_CONTROL_IDS.dashed]: false,
          [POINT_STYLE_CONTROL_IDS.shadow]: 'none',
        },
      },
      {
        id: 'gradient',
        label: i18n.gradientEmphasis,
        values: {
          [POINT_STYLE_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_STYLE_CONTROL_IDS.dashOffset]: 0,
          [POINT_STYLE_CONTROL_IDS.lineCap]: 'butt',
          [POINT_STYLE_CONTROL_IDS.lineJoin]: 'miter',
          [POINT_STYLE_CONTROL_IDS.shape]: 'circle',
          [POINT_STYLE_CONTROL_IDS.weight]: 0.5,
          [POINT_STYLE_CONTROL_IDS.scalarOpacity]: false,
          [POINT_STYLE_CONTROL_IDS.dotted]: false,
          [POINT_STYLE_CONTROL_IDS.dashPattern]: false,
          [POINT_STYLE_CONTROL_IDS.blendMode]: 'normal',
          [POINT_STYLE_CONTROL_IDS.zIndex]: 'order',

          [POINT_STYLE_CONTROL_IDS.paintMode]: 'gradient',
          [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
          [POINT_STYLE_CONTROL_IDS.stroke]: '#f97316',
          [POINT_STYLE_CONTROL_IDS.strokeWidth]: 3,
          [POINT_STYLE_CONTROL_IDS.fillOpacity]: 0.9,
          [POINT_STYLE_CONTROL_IDS.strokeOpacity]: 1,
          [POINT_STYLE_CONTROL_IDS.opacity]: 0.95,
          [POINT_STYLE_CONTROL_IDS.size]: 18,
          [POINT_STYLE_CONTROL_IDS.dashed]: true,
          [POINT_STYLE_CONTROL_IDS.shadow]: 'xl',
        },
      },
    ],
    relatedApis: [
      'PointMark.properties.dashOffset',
      'PointMark.properties.lineCap',
      'PointMark.properties.lineJoin',
      'PointMark.properties.shape',
      'PointMark.dotted',
      'PointMark.dashPattern',
      'PointMark.blendMode',
      'PointMark.zIndex',

      'Plot.coordinate',
      'PointMark.color',
      'PointMark.fill',
      'PointMark.stroke',
      'PointMark.strokeWidth',
      'PointMark.opacity.fill',
      'PointMark.opacity.stroke',
      'PointMark.opacity',
      'PointMark.size',
      'PointMark.dashed',
      'PointMark.shadow',
    ],
  } satisfies PreviewControlContract;
};

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract();
