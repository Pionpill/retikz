import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 圆形与椭圆裁剪示例使用的稳定字段 id */
export const CircleEllipseClipControlId = {
  CircleRadius: 'circleRadius',
  EllipseRadiusX: 'ellipseRadiusX',
  EllipseRadiusY: 'ellipseRadiusY',
} as const;

/** 圆形与椭圆裁剪示例的中文属性面板 */
export const circleEllipseClipControls = definePreviewControls({
  presentation: 'panel',
  title: '圆 / 椭圆',
  sections: [
    {
      label: '圆形参数',
      controls: [
        {
          kind: 'range',
          id: CircleEllipseClipControlId.CircleRadius,
          label: '半径',
          defaultValue: 48,
          min: 28,
          max: 66,
          step: 2,
        },
      ],
    },
    {
      label: '椭圆参数',
      controls: [
        {
          kind: 'range',
          id: CircleEllipseClipControlId.EllipseRadiusX,
          label: '横向半径',
          defaultValue: 62,
          min: 34,
          max: 76,
          step: 2,
        },
        {
          kind: 'range',
          id: CircleEllipseClipControlId.EllipseRadiusY,
          label: '纵向半径',
          defaultValue: 42,
          min: 24,
          max: 62,
          step: 2,
        },
      ],
    },
  ],
});

/** 圆形与椭圆裁剪示例的稳定文档契约 */
export const previewControlContract = {
  controls: circleEllipseClipControls,
  canonicalValues: {
    circleRadius: 48,
    ellipseRadiusX: 62,
    ellipseRadiusY: 42,
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRCircleClip.r', 'IREllipseClip.rx', 'IREllipseClip.ry'],
} satisfies PreviewControlContract;
