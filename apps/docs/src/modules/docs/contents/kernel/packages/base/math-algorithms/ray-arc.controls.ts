import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 射线圆弧 playground 的稳定字段 id */
export const RayArcPlaygroundControlId = {
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
} as const;

/** 射线圆弧起止角度控制面板 */
export const rayArcPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '射线与圆弧',
  sections: [
    {
      label: '圆弧范围',
      controls: [
        {
          kind: 'range',
          id: RayArcPlaygroundControlId.StartAngle,
          label: '起始角度',
          defaultValue: 150,
          min: 0,
          max: 540,
          step: 15,
        },
        {
          kind: 'range',
          id: RayArcPlaygroundControlId.EndAngle,
          label: '终止角度',
          defaultValue: 390,
          min: 0,
          max: 540,
          step: 15,
        },
      ],
    },
  ],
});

/** 射线圆弧 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: rayArcPlaygroundControls,
  canonicalValues: { startAngle: 150, endAngle: 390 },
  presets: [
    { id: 'two-hits', label: '两个交点', values: { startAngle: 150, endAngle: 390 } },
    { id: 'one-hit', label: '一个交点', values: { startAngle: 210, endAngle: 510 } },
    { id: 'reverse-sweep', label: '反向扫描', values: { startAngle: 390, endAngle: 150 } },
  ],
  relatedApis: ['RayArcInput', 'rayArc'],
} satisfies PreviewControlContract;
