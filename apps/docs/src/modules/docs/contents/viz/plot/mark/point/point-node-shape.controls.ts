import type { PointMarkProps } from '@retikz/plot-react';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';

/** 节点形态 playground 的稳定控件 id */
export const POINT_NODE_SHAPE_CONTROL_IDS = {
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
export const pointNodeShapeControls = definePreviewControls({
  presentation: 'panel',
  title: '节点形态',
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
          id: POINT_NODE_SHAPE_CONTROL_IDS.coordinate,
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
      label: '节点边界',
      controls: [
        {
          kind: 'select',
          id: POINT_NODE_SHAPE_CONTROL_IDS.shape,
          label: '形状',
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: '圆形' },
            { value: 'rectangle', label: '矩形' },
            { value: 'diamond', label: '菱形' },
            { value: 'star', label: '星形' },
            { value: 'polygon', label: '多边形' },
          ],
        },
        {
          kind: 'range',
          id: POINT_NODE_SHAPE_CONTROL_IDS.size,
          label: '节点尺寸',
          defaultValue: 18,
          min: 10,
          max: 36,
          step: 1,
        },
        {
          kind: 'range',
          id: POINT_NODE_SHAPE_CONTROL_IDS.rotate,
          label: '旋转角度',
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
          label: '星形角数',
          defaultValue: 5,
          min: 3,
          max: 9,
          step: 1,
          visibleWhen: { controlId: POINT_NODE_SHAPE_CONTROL_IDS.shape, oneOf: ['star'] },
        },
        {
          kind: 'range',
          id: POINT_NODE_SHAPE_CONTROL_IDS.polygonSides,
          label: '多边形边数',
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
export const previewControlContract = {
  controls: pointNodeShapeControls,
  canonicalValues: {
    [POINT_NODE_SHAPE_CONTROL_IDS.coordinate]: 'cartesian2D',
    [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'circle',
    [POINT_NODE_SHAPE_CONTROL_IDS.size]: 18,
    [POINT_NODE_SHAPE_CONTROL_IDS.rotate]: 0,
    [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 5,
    [POINT_NODE_SHAPE_CONTROL_IDS.polygonSides]: 6,
  },
  presets: [
    {
      id: 'circle',
      label: '基础圆点',
      values: {
        [POINT_NODE_SHAPE_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'circle',
        [POINT_NODE_SHAPE_CONTROL_IDS.size]: 18,
        [POINT_NODE_SHAPE_CONTROL_IDS.rotate]: 0,
        [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 5,
        [POINT_NODE_SHAPE_CONTROL_IDS.polygonSides]: 6,
      },
    },
    {
      id: 'parametric',
      label: '参数形状',
      values: {
        [POINT_NODE_SHAPE_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'star',
        [POINT_NODE_SHAPE_CONTROL_IDS.size]: 28,
        [POINT_NODE_SHAPE_CONTROL_IDS.rotate]: 18,
        [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 7,
        [POINT_NODE_SHAPE_CONTROL_IDS.polygonSides]: 6,
      },
    },
  ],
  relatedApis: ['Plot.coordinate', 'PointMark.shape', 'PointMark.size', 'PointMark.rotate'],
} satisfies PreviewControlContract;
