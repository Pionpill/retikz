import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_NODE_SHAPE_CONTROL_IDS } from './point-node-shape.controls';

/** PointMark 节点形态的英文属性面板 */
export const pointNodeShapeControls = definePreviewControls({
  presentation: 'panel',
  title: 'Node shapes',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'points', label: 'Point rows', rows: points }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: POINT_NODE_SHAPE_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
      ],
    },
    {
      label: 'Node boundary',
      controls: [
        {
          kind: 'select',
          id: POINT_NODE_SHAPE_CONTROL_IDS.shape,
          label: 'Shape',
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: 'Circle' },
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'diamond', label: 'Diamond' },
            { value: 'star', label: 'Star' },
            { value: 'polygon', label: 'Polygon' },
          ],
        },
        {
          kind: 'range',
          id: POINT_NODE_SHAPE_CONTROL_IDS.size,
          label: 'Node size',
          defaultValue: 18,
          min: 10,
          max: 36,
          step: 1,
        },
        {
          kind: 'range',
          id: POINT_NODE_SHAPE_CONTROL_IDS.rotate,
          label: 'Rotation',
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
          label: 'Star points',
          defaultValue: 5,
          min: 3,
          max: 9,
          step: 1,
          visibleWhen: { controlId: POINT_NODE_SHAPE_CONTROL_IDS.shape, oneOf: ['star'] },
        },
        {
          kind: 'range',
          id: POINT_NODE_SHAPE_CONTROL_IDS.polygonSides,
          label: 'Polygon sides',
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

/** PointMark 节点形态的英文稳定文档契约 */
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
      label: 'Basic circles',
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
      label: 'Parametric shape',
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
