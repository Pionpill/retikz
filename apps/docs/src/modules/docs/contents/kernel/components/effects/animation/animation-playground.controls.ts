import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** 动画 playground 的稳定字段 id */
export const AnimationPlaygroundControlId = {
  From: 'from',
  Duration: 'duration',
  Delay: 'delay',
  Easing: 'easing',
  Origin: 'origin',
} as const;

/** scaleIn 参数的中文属性面板 */
export const animationPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '调整 scaleIn',
  sections: [
    {
      label: '关键帧',
      controls: [
        {
          kind: 'range',
          id: AnimationPlaygroundControlId.From,
          label: 'from',
          defaultValue: 0.8,
          min: 0,
          max: 1.5,
          step: 0.05,
        },
      ],
    },
    {
      label: '时序',
      controls: [
        {
          kind: 'range',
          id: AnimationPlaygroundControlId.Duration,
          label: 'duration',
          defaultValue: 400,
          min: 200,
          max: 1600,
          step: 100,
        },
        {
          kind: 'range',
          id: AnimationPlaygroundControlId.Delay,
          label: 'delay',
          defaultValue: 0,
          min: 0,
          max: 1000,
          step: 100,
        },
        {
          kind: 'select',
          id: AnimationPlaygroundControlId.Easing,
          label: 'easing',
          defaultValue: 'ease-out',
          options: [
            { value: 'linear', label: 'linear' },
            { value: 'ease-in', label: 'ease-in' },
            { value: 'ease-out', label: 'ease-out' },
            { value: 'ease-in-out', label: 'ease-in-out' },
          ],
        },
      ],
    },
    {
      label: '支点',
      controls: [
        {
          kind: 'select',
          id: AnimationPlaygroundControlId.Origin,
          label: 'origin',
          defaultValue: 'center',
          options: [
            { value: 'center', label: '中心' },
            { value: 'top', label: '上边' },
            { value: 'right', label: '右边' },
            { value: 'bottom', label: '下边' },
            { value: 'left', label: '左边' },
          ],
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: animationPlaygroundControls,
  canonicalValues: { from: 0.8, duration: 400, delay: 0, easing: 'ease-out', origin: 'center' },
  presets: [
    {
      id: 'gentle',
      label: '柔和',
      values: { from: 0.9, duration: 900, delay: 0, easing: 'ease-in-out', origin: 'center' },
    },
    {
      id: 'snappy',
      label: '利落',
      values: { from: 0.6, duration: 300, delay: 0, easing: 'ease-out', origin: 'bottom' },
    },
  ],
  relatedApis: [
    'scaleIn.from',
    'AnimationTrack.duration',
    'AnimationTrack.delay',
    'AnimationTrack.easing',
    'AnimationTrack.origin',
  ],
} satisfies PreviewControlContract;
