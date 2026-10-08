import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { thousandsRows } from './extension-format.data';

/** English data panel for the custom format example */
export const extensionFormatControls = definePreviewControls({
  presentation: 'panel',
  title: 'Named format',
  sections: [{ controls: [{ kind: 'table', id: 'rows', label: 'K-suffixed strings', rows: thousandsRows }] }],
});

/** Stable documentation contract for the custom format example */
export const previewControlContract = {
  controls: extensionFormatControls,
  canonicalValues: {},
  relatedApis: ['Plot.formatDefinitions', 'FieldFormatDefinition'],
} satisfies PreviewControlContract;
