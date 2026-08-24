import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EntityDefinitionControlId } from './entity-definition.controls';

/** English controls for the Entity predicate demo */
export const entityDefinitionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity predicate',
  sections: [
    {
      label: 'Predicate params',
      controls: [
        {
          kind: 'select',
          id: EntityDefinitionControlId.Status,
          label: 'Service status',
          defaultValue: 'available',
          options: [
            { value: 'available', label: 'Available' },
            { value: 'degraded', label: 'Degraded' },
            { value: 'offline', label: 'Offline' },
          ],
        },
        {
          kind: 'switch',
          id: EntityDefinitionControlId.Critical,
          label: 'Critical service',
          defaultValue: false,
        },
      ],
    },
    {
      label: 'Text',
      controls: [
        {
          kind: 'text',
          id: EntityDefinitionControlId.Content,
          label: 'Text',
          defaultValue: 'API Gateway',
          placeholder: 'Enter Entity text',
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Entity predicate demo */
export const previewControlContract = {
  controls: entityDefinitionControls,
  canonicalValues: {
    status: 'available',
    critical: false,
    content: 'API Gateway',
  },
  relatedApis: ['Entity.predicate.params', 'defineEntityPredicate.paramsSchema', 'GraphThemeLayer.rules'],
} satisfies PreviewControlContract;
