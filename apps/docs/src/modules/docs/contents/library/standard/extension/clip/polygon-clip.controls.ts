import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 多边形裁剪示例使用的稳定字段 id */
export const PolygonClipControlId = {
  Top: 'top',
  Right: 'right',
  Left: 'left',
} as const;

/** 多边形裁剪示例的中文属性面板 */
export const polygonClipControls = definePreviewControls({
  presentation: 'panel',
  title: '多边形裁剪',
  sections: [
    {
      label: '顶点坐标',
      controls: [
        {
          kind: 'point',
          id: PolygonClipControlId.Top,
          label: '顶部顶点',
          defaultValue: [100, 24],
          min: [70, 10],
          max: [130, 60],
          step: 2,
        },
        {
          kind: 'point',
          id: PolygonClipControlId.Right,
          label: '右下顶点',
          defaultValue: [180, 164],
          min: [140, 120],
          max: [190, 184],
          step: 2,
        },
        {
          kind: 'point',
          id: PolygonClipControlId.Left,
          label: '左下顶点',
          defaultValue: [20, 164],
          min: [10, 120],
          max: [60, 184],
          step: 2,
        },
      ],
    },
  ],
});

/** 多边形裁剪示例的稳定文档契约 */
export const previewControlContract = {
  controls: polygonClipControls,
  canonicalValues: {
    top: [100, 24],
    right: [180, 164],
    left: [20, 164],
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRPolygonClip.points'],
} satisfies PreviewControlContract;
