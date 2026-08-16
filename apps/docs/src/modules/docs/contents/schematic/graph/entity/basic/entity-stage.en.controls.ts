import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EntityStageControlId } from './entity-stage.controls';

/** Controls for the stage playground */
export const entityStageControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity: stage',
  sections: [
    {
      label: 'Visuals and content',
      controls: [
        { kind: 'color', id: EntityStageControlId.Color, label: 'Color', defaultValue: 'currentColor' },
        {
          kind: 'select',
          id: EntityStageControlId.Variant,
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
          id: EntityStageControlId.Content,
          label: 'Inner content',
          defaultValue: 'Process',
          placeholder: 'Enter node content',
          multiline: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the stage playground */
export const previewControlContract = {
  controls: entityStageControls,
  canonicalValues: { color: 'currentColor', variant: 'default', content: 'Process' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
