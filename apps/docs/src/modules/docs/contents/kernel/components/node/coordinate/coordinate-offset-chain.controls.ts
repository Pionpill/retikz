import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Coordinate 偏移链 demo 使用的稳定字段 id */
export const CoordinateOffsetChainControlId = {
  RootX: 'rootX',
  RootY: 'rootY',
  StepX: 'stepX',
} as const;

/** Coordinate 偏移链 playground 的固定取景 */
export const coordinateOffsetChainFrame = {
  width: 400,
  height: 191,
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
      label: '根节点位置',
      controls: [
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.RootX,
          label: 'x 坐标',
          defaultValue: -140,
          min: -170,
          max: -90,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.RootY,
          label: 'y 坐标',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
      ],
    },
    {
      label: '链式偏移',
      controls: [
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.StepX,
          label: '水平偏移',
          defaultValue: 120,
          min: 80,
          max: 140,
          step: 10,
        },
      ],
    },
  ],
});

/** Coordinate 偏移链面板的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateOffsetChainControls,
  canonicalValues: { rootX: -140, rootY: 0, stepX: 120 },
  relatedApis: ['Coordinate.position'],
} satisfies PreviewControlContract;
