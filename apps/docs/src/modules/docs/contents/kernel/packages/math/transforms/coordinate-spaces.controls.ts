import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 坐标空间 playground 的稳定字段 id */
export const CoordinateSpacesControlId = {
  CenterX: 'centerX',
  CenterY: 'centerY',
  Rotation: 'rotation',
  LocalX: 'localX',
  LocalY: 'localY',
} as const;

/** 坐标空间 playground 的中文属性面板 */
export const coordinateSpacesControls = definePreviewControls({
  presentation: 'panel',
  title: '坐标变换',
  sections: [
    {
      label: '图形位置',
      controls: [
        {
          kind: 'range',
          id: CoordinateSpacesControlId.CenterX,
          label: '中心 x',
          defaultValue: 70,
          min: 30,
          max: 100,
          step: 5,
        },
        {
          kind: 'range',
          id: CoordinateSpacesControlId.CenterY,
          label: '中心 y',
          defaultValue: 35,
          min: -20,
          max: 50,
          step: 5,
        },
        {
          kind: 'range',
          id: CoordinateSpacesControlId.Rotation,
          label: '旋转角（度）',
          defaultValue: 30,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
    {
      label: '局部点',
      controls: [
        {
          kind: 'range',
          id: CoordinateSpacesControlId.LocalX,
          label: '局部 x',
          defaultValue: 40,
          min: -50,
          max: 50,
          step: 5,
        },
        {
          kind: 'range',
          id: CoordinateSpacesControlId.LocalY,
          label: '局部 y',
          defaultValue: 0,
          min: -30,
          max: 30,
          step: 5,
        },
      ],
    },
  ],
});

/** 坐标空间 playground 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: coordinateSpacesControls,
  canonicalValues: { centerX: 70, centerY: 35, rotation: 30, localX: 40, localY: 0 },
  presets: [
    {
      id: 'axis-aligned',
      label: '未旋转',
      values: { centerX: 70, centerY: 35, rotation: 0, localX: 40, localY: 0 },
    },
    {
      id: 'rotated',
      label: '旋转图形',
      values: { centerX: 70, centerY: 35, rotation: 30, localX: 40, localY: 0 },
    },
    {
      id: 'offset-point',
      label: '偏移局部点',
      values: { centerX: 70, centerY: 35, rotation: 30, localX: 25, localY: -25 },
    },
  ],
  relatedApis: ['CenteredShape', 'localToWorld'],
} satisfies PreviewControlContract;
