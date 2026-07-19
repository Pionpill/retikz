import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Coordinate 偏移链 demo 使用的稳定字段 id */
export const CoordinateOffsetChainControlId = {
  RootX: 'rootX',
  RootY: 'rootY',
  StepX: 'stepX',
} as const;

/** Coordinate 偏移链 playground 的固定取景 */
export const coordinateOffsetChainFrame = {
  width: 440,
  height: 210,
  viewBox: { x: -220, y: -105, width: 440, height: 210 },
  xAxis: [
    [-200, 0],
    [200, 0],
  ] as Array<[number, number]>,
  yAxis: [
    [0, -85],
    [0, 85],
  ] as Array<[number, number]>,
} as const;

/** Coordinate 偏移链的中文属性面板 */
export const coordinateOffsetChainControls = definePreviewControls({
  presentation: 'panel',
  title: '偏移链',
  sections: [
    {
      label: 'position',
      controls: [
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.RootX,
          label: 'position x',
          defaultValue: -140,
          min: -170,
          max: -90,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.RootY,
          label: 'position y',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
      ],
    },
    {
      label: 'offset',
      controls: [
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.StepX,
          label: 'offset x',
          defaultValue: 120,
          min: 80,
          max: 140,
          step: 10,
        },
      ],
    },
  ],
});
