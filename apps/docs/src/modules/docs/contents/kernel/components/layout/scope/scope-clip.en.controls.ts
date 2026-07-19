import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ScopeClipControlId } from './scope-clip.controls';

/** Scope clip controls in English */
export const scopeClipEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope clip',
  sections: [
    {
      label: 'Output boundary',
      controls: [
        {
          kind: 'select',
          id: ScopeClipControlId.ClipKind,
          label: 'clip type',
          defaultValue: 'circle',
          options: [
            { value: 'rect', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'polygon', label: 'Polygon' },
            { value: 'path', label: 'Path' },
            { value: 'compound', label: 'Compound' },
          ],
        },
      ],
    },
  ],
});
