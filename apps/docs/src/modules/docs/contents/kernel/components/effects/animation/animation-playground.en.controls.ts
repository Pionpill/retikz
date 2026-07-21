import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { AnimationPlaygroundControlId } from './animation-playground.controls';

/** scaleIn controls panel in English */
export const animationPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Tune scaleIn',
  sections: [
    {
      label: 'Keyframes',
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
      label: 'Timing',
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
      label: 'Pivot',
      controls: [
        {
          kind: 'select',
          id: AnimationPlaygroundControlId.Origin,
          label: 'origin',
          defaultValue: 'center',
          options: [
            { value: 'center', label: 'Center' },
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
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
      label: 'Gentle',
      values: { from: 0.9, duration: 900, delay: 0, easing: 'ease-in-out', origin: 'center' },
    },
    {
      id: 'snappy',
      label: 'Snappy',
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
