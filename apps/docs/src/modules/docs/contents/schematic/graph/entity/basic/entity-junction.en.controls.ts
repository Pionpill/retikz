import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EntityJunctionControlId } from './entity-junction.controls';

/** Controls for the junction playground */
export const entityJunctionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity: junction',
  sections: [
    {
      label: 'Visuals and content',
      controls: [
        { kind: 'color', id: EntityJunctionControlId.Color, label: 'Color', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: EntityJunctionControlId.Variant,
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
          id: EntityJunctionControlId.Content,
          label: 'Inner content',
          defaultValue: '+',
          placeholder: 'Enter node content',
          multiline: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the junction playground */
export const previewControlContract = {
  controls: entityJunctionControls,
  canonicalValues: { color: '#2563eb', variant: 'default', content: '+' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
