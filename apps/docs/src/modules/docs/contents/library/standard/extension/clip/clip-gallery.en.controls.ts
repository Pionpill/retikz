import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ClipGalleryControlId } from './clip-gallery.controls';

export const clipGalleryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Compound clipping',
  sections: [
    {
      label: 'Left and right regions',
      controls: [
        {
          kind: 'select',
          id: ClipGalleryControlId.Left,
          label: 'Left type',
          defaultValue: 'circle',
          options: [
            { value: 'rect', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'polygon', label: 'Polygon' },
          ],
        },
        {
          kind: 'select',
          id: ClipGalleryControlId.Right,
          label: 'Right type',
          defaultValue: 'circle',
          options: [
            { value: 'rect', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'polygon', label: 'Polygon' },
          ],
        },
      ],
    },
    {
      label: 'Region position',
      controls: [
        {
          kind: 'range',
          id: ClipGalleryControlId.LeftX,
          label: 'Left position',
          defaultValue: -130,
          min: -200,
          max: 0,
          step: 10,
        },
        {
          kind: 'range',
          id: ClipGalleryControlId.RightX,
          label: 'Right position',
          defaultValue: 130,
          min: 0,
          max: 200,
          step: 10,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: clipGalleryControls,
  canonicalValues: {
    [ClipGalleryControlId.Left]: 'circle',
    [ClipGalleryControlId.Right]: 'circle',
    [ClipGalleryControlId.LeftX]: -130,
    [ClipGalleryControlId.RightX]: 130,
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'CompoundClip.children'],
} satisfies PreviewControlContract;
