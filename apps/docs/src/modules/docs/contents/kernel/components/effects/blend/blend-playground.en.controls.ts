import { BlendMode } from '@retikz/core';

import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { BlendPlaygroundControlId } from './blend-playground.controls';

const blendModeOptions = Object.values(BlendMode).map(value => ({ value, label: value }));

/** Blend-mode controls panel in English */
export const blendPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Explore blend modes',
  sections: [
    {
      label: 'Compositing',
      controls: [
        {
          kind: 'select',
          id: BlendPlaygroundControlId.Mode,
          label: 'blendMode',
          defaultValue: BlendMode.Screen,
          options: blendModeOptions,
        },
      ],
    },
    {
      label: 'Colors',
      controls: [
        { kind: 'color', id: BlendPlaygroundControlId.Background, label: 'Background', defaultValue: '#0f172a' },
        { kind: 'color', id: BlendPlaygroundControlId.SourceA, label: 'Backdrop circle', defaultValue: '#f97316' },
        { kind: 'color', id: BlendPlaygroundControlId.SourceB, label: 'Source circle', defaultValue: '#06b6d4' },
      ],
    },
    {
      label: 'Opacity',
      controls: [
        {
          kind: 'range',
          id: BlendPlaygroundControlId.Opacity,
          label: 'Source opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: blendPlaygroundControls,
  canonicalValues: {
    mode: BlendMode.Screen,
    background: '#0f172a',
    sourceA: '#f97316',
    sourceB: '#06b6d4',
    opacity: 1,
  },
  presets: [
    {
      id: 'screen',
      label: 'Lighten on dark',
      values: {
        mode: BlendMode.Screen,
        background: '#0f172a',
        sourceA: '#f97316',
        sourceB: '#06b6d4',
        opacity: 1,
      },
    },
    {
      id: 'multiply',
      label: 'Darken on light',
      values: {
        mode: BlendMode.Multiply,
        background: '#f8fafc',
        sourceA: '#22c55e',
        sourceB: '#3b82f6',
        opacity: 1,
      },
    },
  ],
  relatedApis: ['Node.blendMode', 'Path.blendMode'],
} satisfies PreviewControlContract;
