import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { canonicalRows, mixedRows, reportRows } from './value-parsing.data';

/** English controls for value parsing */
export const valueParsingControls = definePreviewControls({
  presentation: 'panel',
  title: 'Value parsing',
  sections: [
    {
      label: 'Input data',
      controls: [
        {
          kind: 'table',
          id: 'canonicalRows',
          label: 'Canonical values',
          rows: canonicalRows,
          visibleWhen: { controlId: 'inputShape', oneOf: ['canonical'] },
        },
        {
          kind: 'table',
          id: 'mixedRows',
          label: 'Mixed storage',
          rows: mixedRows,
          visibleWhen: { controlId: 'inputShape', oneOf: ['mixed'] },
        },
        {
          kind: 'table',
          id: 'reportRows',
          label: 'Report format',
          rows: reportRows,
          visibleWhen: { controlId: 'inputShape', oneOf: ['report'] },
        },
      ],
    },
    {
      label: 'Normalization',
      controls: [
        {
          kind: 'select',
          id: 'inputShape',
          label: 'Storage shape',
          defaultValue: 'mixed',
          options: [
            { value: 'canonical', label: 'Canonical ISO + number' },
            { value: 'mixed', label: 'Mixed built-in coercion' },
            { value: 'report', label: 'slashDate + percent' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for value parsing */
export const previewControlContract = {
  controls: valueParsingControls,
  canonicalValues: { inputShape: 'mixed' },
  presets: [
    { id: 'canonical', label: 'Canonical values', values: { inputShape: 'canonical' } },
    { id: 'mixed', label: 'Built-in coercion', values: { inputShape: 'mixed' } },
    { id: 'report', label: 'Declarative formats', values: { inputShape: 'report' } },
  ],
  relatedApis: ['Plot.model', 'IRDataFieldDefinition.format'],
} satisfies PreviewControlContract;
