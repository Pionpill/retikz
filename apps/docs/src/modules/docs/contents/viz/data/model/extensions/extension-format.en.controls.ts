import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { wanRows } from './extension-format.data';

/** English data panel for the custom format example */
export const extensionFormatControls = definePreviewControls({
  presentation: 'panel',
  title: 'Named format',
  sections: [
    { label: 'Input data', controls: [{ kind: 'table', id: 'rows', label: 'Ten-thousand strings', rows: wanRows }] },
  ],
});

/** Stable documentation contract for the custom format example */
export const previewControlContract = {
  controls: extensionFormatControls,
  canonicalValues: {},
  relatedApis: ['Plot.formatDefinitions', 'FieldFormatDefinition'],
} satisfies PreviewControlContract;
