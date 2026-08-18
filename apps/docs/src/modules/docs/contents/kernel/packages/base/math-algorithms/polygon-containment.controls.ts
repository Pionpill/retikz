import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 多边形 playground 的稳定字段 id */
export const PolygonContainmentControlId = {
  Shape: 'shape',
  TestPointA: 'testPointA',
  TestPointB: 'testPointB',
  TestPointC: 'testPointC',
} as const;

/** 多边形形状与测试点控制面板 */
export const polygonContainmentControls = definePreviewControls({
  presentation: 'panel',
  title: '多边形与凸包',
  sections: [
    {
      label: '输入形状',
      controls: [
        {
          kind: 'select',
          id: PolygonContainmentControlId.Shape,
          label: '多边形',
          defaultValue: 'concave',
          options: [
            { value: 'concave', label: '凹多边形' },
            { value: 'convex', label: '凸多边形' },
          ],
        },
      ],
    },
    {
      label: '测试点',
      controls: [
        {
          kind: 'point',
          id: PolygonContainmentControlId.TestPointA,
          label: '点 A',
          defaultValue: [0, 8],
          min: [-160, -95],
          max: [160, 95],
          step: 5,
        },
        {
          kind: 'point',
          id: PolygonContainmentControlId.TestPointB,
          label: '点 B',
          defaultValue: [150, 80],
          min: [-160, -95],
          max: [160, 95],
          step: 5,
        },
        {
          kind: 'point',
          id: PolygonContainmentControlId.TestPointC,
          label: '点 C',
          defaultValue: [0, -60],
          min: [-160, -95],
          max: [160, 95],
          step: 5,
        },
      ],
    },
  ],
});

/** 多边形 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: polygonContainmentControls,
  canonicalValues: {
    shape: 'concave',
    testPointA: [0, 8],
    testPointB: [150, 80],
    testPointC: [0, -60],
  },
  relatedApis: ['polygon.containsPoint', 'convexHull'],
} satisfies PreviewControlContract;
