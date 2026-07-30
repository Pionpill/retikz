import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { categoricalRows, continuousRows, funnelRows, temporalRows } from './field-contract-playground.data';

/** English controls for the field-type playground */
export const fieldContractControls = definePreviewControls({
  presentation: 'panel',
  title: 'Field contract',
  sections: [
    {
      label: 'Input data',
      controls: [
        {
          kind: 'table',
          id: 'continuousRows',
          label: 'Continuous values',
          rows: continuousRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['continuous'] },
        },
        {
          kind: 'table',
          id: 'temporalRows',
          label: 'Time series',
          rows: temporalRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['temporal'] },
        },
        {
          kind: 'table',
          id: 'categoricalRows',
          label: 'Categories',
          rows: categoricalRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['categorical'] },
        },
        {
          kind: 'table',
          id: 'funnelRows',
          label: 'Numeric stage codes',
          rows: funnelRows,
          visibleWhen: { controlId: 'scenario', oneOf: ['funnel'] },
        },
      ],
    },
    {
      label: 'Field semantics',
      controls: [
        {
          kind: 'select',
          id: 'scenario',
          label: 'Data scenario',
          defaultValue: 'funnel',
          options: [
            { value: 'continuous', label: 'Continuous values' },
            { value: 'temporal', label: 'Dates' },
            { value: 'categorical', label: 'Categories' },
            { value: 'funnel', label: 'Numeric category codes' },
          ],
        },
        {
          kind: 'select',
          id: 'stageType',
          label: 'Stage field type',
          defaultValue: 'categorical',
          options: [
            { value: 'inferred', label: 'Infer automatically' },
            { value: 'categorical', label: 'Explicit categorical' },
          ],
          visibleWhen: { controlId: 'scenario', oneOf: ['funnel'] },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the field-type playground */
export const previewControlContract = {
  controls: fieldContractControls,
  canonicalValues: { scenario: 'funnel', stageType: 'categorical' },
  relatedApis: ['Plot.model', 'IRDataFieldDefinition.type'],
} satisfies PreviewControlContract;
