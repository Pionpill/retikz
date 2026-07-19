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
      label: 'position',
      controls: [
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.PositionX,
          label: 'position x',
          defaultValue: 0,
          min: -30,
          max: 30,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.PositionY,
          label: 'position y',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 10,
        },
      ],
    },
    {
      label: 'distance',
      controls: [
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.HorizontalDistance,
          label: 'distance x',
          defaultValue: 110,
          min: 80,
          max: 130,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.VerticalDistance,
          label: 'distance y',
          defaultValue: 65,
          min: 50,
          max: 80,
          step: 5,
        },
      ],
    },
  ],
});
