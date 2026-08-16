import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EntityTerminalControlId } from './entity-terminal.controls';

/** Controls for the terminal playground */
export const entityTerminalControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity: terminal',
  sections: [
    {
      label: 'Visuals and content',
      controls: [
        { kind: 'color', id: EntityTerminalControlId.Color, label: 'Color', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: EntityTerminalControlId.Variant,
          label: 'Visual variant',
          defaultValue: 'default',
          options: [
            { value: 'default', label: 'Default' },
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
            { value: 'outline', label: 'Outline' },
            { value: 'vibrant', label: 'Vibrant' },
          ],
        },
        {
          kind: 'text',
          id: EntityTerminalControlId.Content,
          label: 'Inner content',
          defaultValue: 'Start',
          placeholder: 'Enter node content',
          multiline: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the terminal playground */
export const previewControlContract = {
  controls: entityTerminalControls,
  canonicalValues: { color: '#2563eb', variant: 'default', content: 'Start' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
