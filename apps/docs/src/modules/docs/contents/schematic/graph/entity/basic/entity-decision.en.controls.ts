import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EntityDecisionControlId } from './entity-decision.controls';

/** Controls for the decision playground */
export const entityDecisionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity: decision',
  sections: [
    {
      label: 'Visuals and content',
      controls: [
        { kind: 'color', id: EntityDecisionControlId.Color, label: 'Color', defaultValue: 'currentColor' },
        {
          kind: 'select',
          id: EntityDecisionControlId.Variant,
          label: 'Visual variant',
          defaultValue: 'default',
          options: [
            { value: 'default', label: 'Default' },
            { value: 'fill', label: 'Fill' },
            { value: 'mixed', label: 'Mixed' },
          ],
        },
        {
          kind: 'text',
          id: EntityDecisionControlId.Content,
          label: 'Inner content',
          defaultValue: 'Ready?',
          placeholder: 'Enter node content',
          multiline: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the decision playground */
export const previewControlContract = {
  controls: entityDecisionControls,
  canonicalValues: { color: 'currentColor', variant: 'default', content: 'Ready?' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
