import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Stable field ids for the Entity playground */
export const EntityPlaygroundControlId = {
  Role: 'role',
  Variant: 'variant',
  Color: 'color',
  Stroke: 'stroke',
  TextColor: 'textColor',
  Content: 'content',
} as const;

/** English controls for the Entity playground */
export const entityPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity playground',
  sections: [
    {
      label: 'Entity semantics',
      controls: [
        {
          kind: 'select',
          id: EntityPlaygroundControlId.Role,
          label: 'Role',
          defaultValue: 'stage',
          options: [
            { value: 'terminal', label: 'Terminal' },
            { value: 'stage', label: 'Stage' },
            { value: 'decision', label: 'Decision' },
            { value: 'junction', label: 'Junction' },
          ],
        },
        {
          kind: 'select',
          id: EntityPlaygroundControlId.Variant,
          label: 'Visual variant',
          defaultValue: 'default',
          options: [
            { value: 'default', label: 'Default' },
            { value: 'fill', label: 'Fill' },
            { value: 'mixed', label: 'Mixed' },
          ],
        },
      ],
    },
    {
      label: 'Node visuals',
      controls: [
        { kind: 'color', id: EntityPlaygroundControlId.Color, label: 'Primary color', defaultValue: 'currentColor' },
        { kind: 'color', id: EntityPlaygroundControlId.Stroke, label: 'Stroke color', defaultValue: 'currentColor' },
        { kind: 'color', id: EntityPlaygroundControlId.TextColor, label: 'Text color', defaultValue: 'currentColor' },
        {
          kind: 'text',
          id: EntityPlaygroundControlId.Content,
          label: 'Content',
          defaultValue: 'Process',
          placeholder: 'Enter node content',
          multiline: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Entity playground */
export const previewControlContract = {
  controls: entityPlaygroundControls,
  canonicalValues: {
    role: 'stage',
    variant: 'default',
    color: 'currentColor',
    stroke: 'currentColor',
    textColor: 'currentColor',
    content: 'Process',
  },
  relatedApis: ['Entity.role', 'Entity.variant', 'Node.color', 'Node.stroke', 'Node.textColor'],
} satisfies PreviewControlContract;
