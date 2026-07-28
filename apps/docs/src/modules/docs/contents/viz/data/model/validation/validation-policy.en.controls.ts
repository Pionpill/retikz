import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { allInvalidRows, cleanRows, dirtyRows } from './validation-policy.data';

/** English controls for data validation policy */
export const validationPolicyControls = definePreviewControls({
  presentation: 'panel',
  title: 'Validation policy',
  sections: [
    {
      label: 'Input data',
      controls: [
        {
          kind: 'table',
          id: 'cleanRows',
          label: 'All valid',
          rows: cleanRows,
          visibleWhen: { controlId: 'dataset', oneOf: ['clean'] },
        },
        {
          kind: 'table',
          id: 'dirtyRows',
          label: 'Partially dirty',
          rows: dirtyRows,
          visibleWhen: { controlId: 'dataset', oneOf: ['dirty'] },
        },
        {
          kind: 'table',
          id: 'allInvalidRows',
          label: 'No valid target values',
          rows: allInvalidRows,
          visibleWhen: { controlId: 'dataset', oneOf: ['allInvalid'] },
        },
      ],
    },
    {
      label: 'Validation',
      controls: [
        {
          kind: 'select',
          id: 'dataset',
          label: 'Data scenario',
          defaultValue: 'dirty',
          options: [
            { value: 'clean', label: 'All valid' },
            { value: 'dirty', label: 'Partially dirty' },
            { value: 'allInvalid', label: 'No valid target values' },
          ],
        },
        {
          kind: 'select',
          id: 'policy',
          label: 'Policy',
          defaultValue: 'skip',
          options: [
            { value: 'skip', label: 'Skip invalid values' },
            { value: 'sample', label: 'Sample validation' },
            { value: 'error', label: 'Fail on first error' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for data validation policy */
export const previewControlContract = {
  controls: validationPolicyControls,
  canonicalValues: { dataset: 'dirty', policy: 'skip' },
  presets: [
    { id: 'skip-dirty', label: 'Continue past bad values', values: { dataset: 'dirty', policy: 'skip' } },
    { id: 'sample-empty', label: 'Diagnose an empty field', values: { dataset: 'allInvalid', policy: 'sample' } },
    { id: 'strict-dirty', label: 'Fail on the first bad value', values: { dataset: 'dirty', policy: 'error' } },
  ],
  relatedApis: ['Plot.validateData', 'Plot.invalid'],
} satisfies PreviewControlContract;
