import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Coordinate 虚拟锚点 demo 使用的稳定字段 id */
export const CoordinateAsAnchorControlId = {
  PositionX: 'positionX',
  PositionY: 'positionY',
  HorizontalDistance: 'horizontalDistance',
  VerticalDistance: 'verticalDistance',
} as const;

/** Coordinate 虚拟锚点 playground 的固定取景 */
export const coordinateAsAnchorFrame = {
  width: 400,
  height: 250,
  viewBox: { x: -220, y: -140, width: 440, height: 280 },
  xAxis: [
    [-200, 0],
    [200, 0],
  ] as Array<[number, number]>,
  yAxis: [
    [0, -120],
    [0, 120],
  ] as Array<[number, number]>,
} as const;

/** Coordinate 虚拟锚点的中文属性面板 */
export const coordinateAsAnchorControls = definePreviewControls({
  presentation: 'panel',
  title: '虚拟锚点',
  sections: [
    {
      label: '中心位置',
      controls: [
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.PositionX,
          label: 'x 坐标',
          defaultValue: 0,
          min: -30,
          max: 30,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.PositionY,
          label: 'y 坐标',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 10,
        },
      ],
    },
    {
      label: '节点间距',
      controls: [
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.HorizontalDistance,
          label: '水平距离',
          defaultValue: 110,
          min: 80,
          max: 130,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.VerticalDistance,
          label: '垂直距离',
          defaultValue: 65,
          min: 50,
          max: 80,
          step: 5,
        },
      ],
    },
  ],
});

/** Coordinate 虚拟锚点面板的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateAsAnchorControls,
  canonicalValues: { positionX: 0, positionY: 0, horizontalDistance: 110, verticalDistance: 65 },
  relatedApis: ['Coordinate.position', 'Node.position'],
} satisfies PreviewControlContract;
