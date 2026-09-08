import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 向量 playground 的稳定字段 id */
export const VectorNormalControlId = {
  Angle: 'angle',
  Length: 'length',
} as const;

/** 向量方向与长度的中文属性面板 */
export const vectorNormalControls = definePreviewControls({
  presentation: 'panel',
  title: '向量',
  sections: [
    {
      label: '向量 v',
      controls: [
        {
          kind: 'range',
          id: VectorNormalControlId.Angle,
          label: '方向角',
          defaultValue: -30,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: VectorNormalControlId.Length,
          label: '长度',
          defaultValue: 120,
          min: 40,
          max: 140,
          step: 5,
        },
      ],
    },
  ],
});

/** 向量 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: vectorNormalControls,
  canonicalValues: { angle: -30, length: 120 },
  presets: [
    { id: 'axis', label: '水平向量', values: { angle: 0, length: 120 } },
    { id: 'diagonal', label: '对角向量', values: { angle: -45, length: 110 } },
    { id: 'obtuse', label: '钝角向量', values: { angle: 135, length: 90 } },
  ],
  relatedApis: ['vector2.add', 'vector2.scale', 'vector2.fromAngleDegrees', 'vector2.normal'],
} satisfies PreviewControlContract;
