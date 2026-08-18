import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 椭圆与圆弧 playground 的稳定字段 id */
export const EllipseArcPlaygroundControlId = {
  EllipseRadiusX: 'ellipseRadiusX',
  EllipseRadiusY: 'ellipseRadiusY',
  ArcRadius: 'arcRadius',
  ArcStartAngle: 'arcStartAngle',
  ArcEndAngle: 'arcEndAngle',
} as const;

/** 椭圆与圆弧的中文属性面板 */
export const ellipseArcPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '椭圆与圆弧',
  sections: [
    {
      label: '椭圆',
      controls: [
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.EllipseRadiusX,
          label: '水平半轴',
          defaultValue: 45,
          min: 30,
          max: 65,
          step: 5,
        },
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.EllipseRadiusY,
          label: '垂直半轴',
          defaultValue: 28,
          min: 20,
          max: 50,
          step: 2,
        },
      ],
    },
    {
      label: '圆弧',
      controls: [
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.ArcRadius,
          label: '半径',
          defaultValue: 42,
          min: 25,
          max: 60,
          step: 5,
        },
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.ArcStartAngle,
          label: '起始角度',
          defaultValue: 25,
          min: 0,
          max: 270,
          step: 5,
        },
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.ArcEndAngle,
          label: '结束角度',
          defaultValue: 250,
          min: 90,
          max: 350,
          step: 5,
        },
      ],
    },
  ],
});

/** 椭圆与圆弧 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: ellipseArcPlaygroundControls,
  canonicalValues: { ellipseRadiusX: 45, ellipseRadiusY: 28, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 250 },
  presets: [
    {
      id: 'balanced',
      label: '标准形状',
      values: { ellipseRadiusX: 45, ellipseRadiusY: 28, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 250 },
    },
    {
      id: 'tall-ellipse',
      label: '高椭圆',
      values: { ellipseRadiusX: 35, ellipseRadiusY: 48, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 145 },
    },
    {
      id: 'long-arc',
      label: '长圆弧',
      values: { ellipseRadiusX: 58, ellipseRadiusY: 24, arcRadius: 52, arcStartAngle: 20, arcEndAngle: 300 },
    },
  ],
  relatedApis: ['ellipse.inscribedInBox', 'ellipse.center', 'arcBoundingPoints', 'boundsOf', 'boundsToRect'],
} satisfies PreviewControlContract;
