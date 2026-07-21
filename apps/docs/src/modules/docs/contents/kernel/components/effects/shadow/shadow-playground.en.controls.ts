import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ShadowPlaygroundControlId } from './shadow-playground.controls';

/** Shadow playground controls panel in English */
export const shadowPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Tune the shadow',
  sections: [
    {
      label: 'Geometry',
      controls: [
        {
          kind: 'range',
          id: ShadowPlaygroundControlId.OffsetX,
          label: 'offsetX',
          defaultValue: 0,
          min: -20,
          max: 20,
        },
        {
          kind: 'range',
          id: ShadowPlaygroundControlId.OffsetY,
          label: 'offsetY',
          defaultValue: 8,
          min: -20,
          max: 30,
        },
        {
          kind: 'range',
          id: ShadowPlaygroundControlId.Blur,
          label: 'blur',
          defaultValue: 15,
          min: 0,
          max: 40,
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        { kind: 'color', id: ShadowPlaygroundControlId.Color, label: 'color', defaultValue: '#0f172a' },
        {
          kind: 'range',
          id: ShadowPlaygroundControlId.Opacity,
          label: 'opacity',
          defaultValue: 0.35,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: shadowPlaygroundControls,
  canonicalValues: { offsetX: 0, offsetY: 8, blur: 15, color: '#0f172a', opacity: 0.35 },
  presets: [
    {
      id: 'compact',
      label: 'Compact',
      values: { offsetX: 0, offsetY: 2, blur: 4, color: '#0f172a', opacity: 0.3 },
    },
    {
      id: 'floating',
      label: 'Floating',
      values: { offsetX: 0, offsetY: 14, blur: 28, color: '#2563eb', opacity: 0.45 },
    },
  ],
  relatedApis: ['Node.shadow', 'Path.shadow'],
} satisfies PreviewControlContract;
