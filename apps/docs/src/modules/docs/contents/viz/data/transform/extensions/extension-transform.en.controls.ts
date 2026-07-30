import { resolveTransformRegistry } from '@retikz/data';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { customTransformRows } from './extension-transform.data';
import { scaleField, scaleFieldOperationOf } from './extension-transform-preview';

const transformRegistry = resolveTransformRegistry([scaleField]);

/** English controls for the custom-transform example */
export const extensionTransformControls = definePreviewControls({
  presentation: 'panel',
  title: 'Custom Field Scaling',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Coordinates',
          views: createTransformTableViews(
            { source: 'Source', result: 'Result' },
            customTransformRows,
            scaleFieldOperationOf,
            { registry: transformRegistry },
          ),
        },
      ],
    },
    {
      label: 'Operation Config',
      controls: [{ kind: 'range', id: 'factor', label: 'Scale factor', defaultValue: 2, min: 0.5, max: 3, step: 0.5 }],
    },
  ],
});

/** Stable documentation contract for the custom-transform example */
export const previewControlContract = {
  controls: extensionTransformControls,
  canonicalValues: { factor: 2 },
  presets: [
    { id: 'identity', label: 'Original', values: { factor: 1 } },
    { id: 'half', label: 'Half', values: { factor: 0.5 } },
    { id: 'double', label: 'Double', values: { factor: 2 } },
    { id: 'triple', label: 'Triple', values: { factor: 3 } },
  ],
  relatedApis: ['defineTransform', 'Plot.transformDefinitions', 'Transform'],
} satisfies PreviewControlContract;
