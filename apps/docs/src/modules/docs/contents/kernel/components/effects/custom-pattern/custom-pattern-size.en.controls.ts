import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { CustomPatternSizeControlId } from './custom-pattern-size.controls';

/** Custom-pattern instance controls panel in English */
export const customPatternSizeControls = definePreviewControls({
  presentation: 'panel',
  title: 'Tune the pattern instance',
  sections: [
    {
      label: 'Tile',
      controls: [
        {
          kind: 'range',
          id: CustomPatternSizeControlId.Size,
          label: 'size',
          defaultValue: 16,
          min: 4,
          max: 24,
        },
        {
          kind: 'range',
          id: CustomPatternSizeControlId.Rotation,
          label: 'rotation',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
        },
      ],
    },
    {
      label: 'Colors',
      controls: [
        { kind: 'color', id: CustomPatternSizeControlId.Color, label: 'color', defaultValue: '#008000' },
        {
          kind: 'select',
          id: CustomPatternSizeControlId.Background,
          label: 'background',
          defaultValue: 'transparent',
          options: [
            { value: 'transparent', label: 'Transparent' },
            { value: '#fef3c7', label: 'Light' },
            { value: '#0f172a', label: 'Dark' },
          ],
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: customPatternSizeControls,
  canonicalValues: { size: 16, rotation: 0, color: '#008000', background: 'transparent' },
  presets: [
    {
      id: 'dense',
      label: 'Dense',
      values: { size: 6, rotation: 0, color: '#008000', background: 'transparent' },
    },
    {
      id: 'rotated',
      label: 'Rotated',
      values: { size: 12, rotation: 45, color: '#ea580c', background: '#fef3c7' },
    },
  ],
  relatedApis: ['IRPaintSpec', 'PatternDefinition', 'Layout.patterns'],
} satisfies PreviewControlContract;
