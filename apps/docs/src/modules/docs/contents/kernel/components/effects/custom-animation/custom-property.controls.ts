import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 自定义动画属性 playground 的稳定字段 id */
export const CustomPropertyControlId = {
  Blur: 'blur',
  Duration: 'duration',
} as const;

/** 自定义 blur 通道的中文属性面板 */
export const customPropertyControls = definePreviewControls({
  presentation: 'panel',
  title: '调整 blur 动画',
  sections: [
    {
      label: '轨道参数',
      controls: [
        {
          kind: 'range',
          id: CustomPropertyControlId.Blur,
          label: 'blur 起点',
          defaultValue: 8,
          min: 0,
          max: 20,
        },
        {
          kind: 'range',
          id: CustomPropertyControlId.Duration,
          label: 'duration',
          defaultValue: 800,
          min: 200,
          max: 1600,
          step: 100,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: customPropertyControls,
  canonicalValues: { blur: 8, duration: 800 },
  presets: [
    { id: 'subtle', label: '轻微', values: { blur: 4, duration: 500 } },
    { id: 'dramatic', label: '明显', values: { blur: 16, duration: 1200 } },
  ],
  relatedApis: ['AnimationPropertyDefinition', 'AnimationTrack.duration'],
} satisfies PreviewControlContract;
