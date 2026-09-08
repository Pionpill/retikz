import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 边界 playground 的稳定字段 id */
export const BoundsPlaygroundControlId = {
  AX: 'aX',
  AY: 'aY',
  BX: 'bX',
  BY: 'bY',
  CX: 'cX',
  CY: 'cY',
  ARC_START_ANGLE: 'arcStartAngle',
  ARC_END_ANGLE: 'arcEndAngle',
} as const;

/** 边界点集的中文属性面板 */
export const boundsPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '边界计算',
  sections: [
    {
      label: '点 A',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.AX,
          label: 'x 坐标',
          defaultValue: -70,
          min: -100,
          max: 100,
          step: 10,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.AY,
          label: 'y 坐标',
          defaultValue: -20,
          min: -80,
          max: 80,
          step: 10,
        },
      ],
    },
    {
      label: '点 B',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.BX,
          label: 'x 坐标',
          defaultValue: 0,
          min: -100,
          max: 100,
          step: 10,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.BY,
          label: 'y 坐标',
          defaultValue: 50,
          min: -80,
          max: 80,
          step: 10,
        },
      ],
    },
    {
      label: '点 C',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.CX,
          label: 'x 坐标',
          defaultValue: 70,
          min: -100,
          max: 100,
          step: 10,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.CY,
          label: 'y 坐标',
          defaultValue: -10,
          min: -80,
          max: 80,
          step: 10,
        },
      ],
    },
    {
      label: '圆弧',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.ARC_START_ANGLE,
          label: '起始角度',
          defaultValue: 200,
          min: 0,
          max: 270,
          step: 5,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.ARC_END_ANGLE,
          label: '终止角度',
          defaultValue: 340,
          min: 90,
          max: 350,
          step: 5,
        },
      ],
    },
  ],
});

/** 边界 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: boundsPlaygroundControls,
  canonicalValues: {
    aX: -70,
    aY: -20,
    bX: 0,
    bY: 50,
    cX: 70,
    cY: -10,
    arcStartAngle: 200,
    arcEndAngle: 340,
  },
  presets: [
    {
      id: 'triangle',
      label: '三角形点集',
      values: {
        aX: -70,
        aY: -20,
        bX: 0,
        bY: 50,
        cX: 70,
        cY: -10,
        arcStartAngle: 200,
        arcEndAngle: 340,
      },
    },
    {
      id: 'wide',
      label: '横向展开',
      values: {
        aX: -100,
        aY: 20,
        bX: 0,
        bY: -35,
        cX: 100,
        cY: 25,
        arcStartAngle: 200,
        arcEndAngle: 340,
      },
    },
    {
      id: 'vertical',
      label: '纵向展开',
      values: {
        aX: -25,
        aY: -70,
        bX: 55,
        bY: 0,
        cX: -10,
        cY: 70,
        arcStartAngle: 270,
        arcEndAngle: 90,
      },
    },
  ],
  relatedApis: ['collectArcBoundingCandidates', 'boundsOf', 'boundsToRect'],
} satisfies PreviewControlContract;
