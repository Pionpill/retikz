import type { PointMarkProps } from '@retikz/plot-react';

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { shapePoints } from './point-api.data';
import { pointNodeShapeI18n } from './point-node-shape.i18n';

/** 节点形态 playground 的稳定控件 id */
export const POINT_NODE_SHAPE_CONTROL_IDS = {
  showRelations: 'point-node-show-relations',
  cornerRadius: 'point-node-shape-cornerRadius',
  scale: 'point-node-shape-scale',
  padding: 'point-node-shape-padding',
  margin: 'point-node-shape-margin',
  boundary: 'point-node-shape-boundary',

  coordinate: 'point-node-coordinate',
  shape: 'point-node-shape',
  size: 'point-node-size',
  rotate: 'point-node-rotate',
  starPoints: 'point-node-star-points',
  polygonSides: 'point-node-polygon-sides',
} as const;

/** 参数化节点形态所需的实时 controls 值 */
export type PointNodeShapeValues = {
  shape: string;
  size: number;
  starPoints: number;
  polygonSides: number;
};

/** 把面板选项映射为 PointMark 可消费的 core Node shape */
export const pointNodeShapeOf = (values: PointNodeShapeValues): NonNullable<PointMarkProps['shape']> => {
  switch (values.shape) {
    case 'rectangle':
      return 'rectangle';
    case 'diamond':
      return 'diamond';
    case 'star':
      return {
        type: 'star',
        params: {
          points: values.starPoints,
          innerRadius: (values.size * 7) / 30,
          outerRadius: values.size / 2,
        },
      };
    case 'polygon':
      return { type: 'polygon', params: { sides: values.polygonSides } };
    default:
      return 'circle';
  }
};

/** PointMark 节点形态的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = pointNodeShapeI18n[lang];
  const pointNodeShapeControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.nodeShapes,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [{ kind: 'table', id: 'points', label: i18n.pointRows, rows: shapePoints }],
      },
      {
        controls: [
          {
            kind: 'switch',
            id: POINT_NODE_SHAPE_CONTROL_IDS.showRelations,
            label: i18n.showRelations,
            defaultValue: true,
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.cornerRadius,
            label: i18n.cornerRadius,
            visibleWhen: { controlId: POINT_NODE_SHAPE_CONTROL_IDS.shape, oneOf: ['rectangle'] },
            defaultValue: 0,
            min: 0,
            max: 12,
            step: 1,
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.scale,
            label: i18n.scale,
            defaultValue: 1,
            min: 0.5,
            max: 1.3,
            step: 0.1,
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.padding,
            label: i18n.padding,
            visibleWhen: {
              controlId: POINT_NODE_SHAPE_CONTROL_IDS.shape,
              oneOf: ['circle', 'rectangle', 'diamond', 'polygon'],
            },
            defaultValue: 0,
            min: 0,
            max: 24,
            step: 1,
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.margin,
            label: i18n.margin,
            defaultValue: 0,
            min: 0,
            max: 12,
            step: 1,
          },
          {
            kind: 'select',
            id: POINT_NODE_SHAPE_CONTROL_IDS.boundary,
            label: i18n.boundary,
            defaultValue: 'shape',
            options: [
              { value: 'shape', label: i18n.boundary0 },
              { value: 'circle', label: i18n.boundary1 },
            ],
          },
        ],
      },
      {
        label: i18n.coordinate,
        controls: [
          {
            kind: 'select',
            id: POINT_NODE_SHAPE_CONTROL_IDS.coordinate,
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
        label: i18n.nodeBoundary,
        controls: [
          {
            kind: 'select',
            id: POINT_NODE_SHAPE_CONTROL_IDS.shape,
            label: i18n.shape,
            defaultValue: 'circle',
            options: [
              { value: 'circle', label: i18n.circle },
              { value: 'rectangle', label: i18n.rectangle },
              { value: 'diamond', label: i18n.diamond },
              { value: 'star', label: i18n.star },
              { value: 'polygon', label: i18n.polygon },
            ],
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.size,
            label: i18n.nodeSize,
            defaultValue: 18,
            min: 10,
            max: 36,
            step: 1,
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.rotate,
            label: i18n.rotation,
            defaultValue: 0,
            min: -90,
            max: 90,
            step: 5,
            visibleWhen: {
              controlId: POINT_NODE_SHAPE_CONTROL_IDS.shape,
              oneOf: ['rectangle', 'diamond', 'star', 'polygon'],
            },
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.starPoints,
            label: i18n.starPoints,
            defaultValue: 5,
            min: 3,
            max: 9,
            step: 1,
            visibleWhen: { controlId: POINT_NODE_SHAPE_CONTROL_IDS.shape, oneOf: ['star'] },
          },
          {
            kind: 'range',
            id: POINT_NODE_SHAPE_CONTROL_IDS.polygonSides,
            label: i18n.polygonSides,
            defaultValue: 6,
            min: 3,
            max: 10,
            step: 1,
            visibleWhen: { controlId: POINT_NODE_SHAPE_CONTROL_IDS.shape, oneOf: ['polygon'] },
          },
        ],
      },
    ],
  });

  /** PointMark 节点形态的稳定文档契约 */
  return {
    controls: pointNodeShapeControls,
    canonicalValues: {
      [POINT_NODE_SHAPE_CONTROL_IDS.coordinate]: 'cartesian2D',
      [POINT_NODE_SHAPE_CONTROL_IDS.showRelations]: true,
      [POINT_NODE_SHAPE_CONTROL_IDS.cornerRadius]: 0,
      [POINT_NODE_SHAPE_CONTROL_IDS.scale]: 1,
      [POINT_NODE_SHAPE_CONTROL_IDS.padding]: 0,
      [POINT_NODE_SHAPE_CONTROL_IDS.margin]: 0,
      [POINT_NODE_SHAPE_CONTROL_IDS.boundary]: 'shape',

      [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'circle',
      [POINT_NODE_SHAPE_CONTROL_IDS.size]: 18,
      [POINT_NODE_SHAPE_CONTROL_IDS.rotate]: 0,
      [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 5,
      [POINT_NODE_SHAPE_CONTROL_IDS.polygonSides]: 6,
    },
    presetSelector: { label: i18n.preset, customLabel: i18n.custom },
    presets: [
      {
        id: 'circle',
        label: i18n.basicCircles,
        values: {
          [POINT_NODE_SHAPE_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_NODE_SHAPE_CONTROL_IDS.showRelations]: true,
          [POINT_NODE_SHAPE_CONTROL_IDS.cornerRadius]: 0,
          [POINT_NODE_SHAPE_CONTROL_IDS.scale]: 1,
          [POINT_NODE_SHAPE_CONTROL_IDS.padding]: 0,
          [POINT_NODE_SHAPE_CONTROL_IDS.margin]: 0,
          [POINT_NODE_SHAPE_CONTROL_IDS.boundary]: 'shape',

          [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'circle',
          [POINT_NODE_SHAPE_CONTROL_IDS.size]: 18,
          [POINT_NODE_SHAPE_CONTROL_IDS.rotate]: 0,
          [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 5,
          [POINT_NODE_SHAPE_CONTROL_IDS.polygonSides]: 6,
        },
      },
      {
        id: 'parametric',
        label: i18n.parametricShape,
        values: {
          [POINT_NODE_SHAPE_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_NODE_SHAPE_CONTROL_IDS.showRelations]: true,
          [POINT_NODE_SHAPE_CONTROL_IDS.cornerRadius]: 0,
          [POINT_NODE_SHAPE_CONTROL_IDS.scale]: 1,
          [POINT_NODE_SHAPE_CONTROL_IDS.padding]: 0,
          [POINT_NODE_SHAPE_CONTROL_IDS.margin]: 0,
          [POINT_NODE_SHAPE_CONTROL_IDS.boundary]: 'shape',

          [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'star',
          [POINT_NODE_SHAPE_CONTROL_IDS.size]: 28,
          [POINT_NODE_SHAPE_CONTROL_IDS.rotate]: 18,
          [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 7,
          [POINT_NODE_SHAPE_CONTROL_IDS.polygonSides]: 6,
        },
      },
    ],
    relatedApis: [
      'PointMark.cornerRadius',
      'PointMark.scale',
      'PointMark.padding',
      'PointMark.margin',
      'PointMark.boundary',
      'Plot.coordinate',
      'PointMark.shape',
      'PointMark.size',
      'PointMark.rotate',
    ],
  } satisfies PreviewControlContract;
};

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract();
