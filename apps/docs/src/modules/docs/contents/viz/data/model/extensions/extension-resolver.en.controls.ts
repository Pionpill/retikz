import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { quarterlyRows } from './extension-resolver.data';

/** English data panel for runtime field resolution */
export const extensionResolverControls = definePreviewControls({
  presentation: 'panel',
  title: 'Runtime resolution',
  sections: [
    { label: 'Input data', controls: [{ kind: 'table', id: 'rows', label: 'Quarterly data', rows: quarterlyRows }] },
  ],
});

/** Stable documentation contract for runtime field resolution */
export const previewControlContract = {
  controls: extensionResolverControls,
  canonicalValues: {},
  relatedApis: ['Plot.resolveField', 'ResolveField'],
} satisfies PreviewControlContract;
