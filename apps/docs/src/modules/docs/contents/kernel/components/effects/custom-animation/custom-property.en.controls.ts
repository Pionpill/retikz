import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { CustomPropertyControlId } from './custom-property.controls';

/** Custom blur-channel controls panel in English */
export const customPropertyControls = definePreviewControls({
  presentation: 'panel',
  title: 'Tune the blur animation',
  sections: [
    {
      label: 'Track parameters',
      controls: [
        {
          kind: 'range',
          id: CustomPropertyControlId.Blur,
          label: 'starting blur',
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
    { id: 'subtle', label: 'Subtle', values: { blur: 4, duration: 500 } },
    { id: 'dramatic', label: 'Dramatic', values: { blur: 16, duration: 1200 } },
  ],
  relatedApis: ['AnimationPropertyDefinition', 'AnimationTrack.duration'],
} satisfies PreviewControlContract;
