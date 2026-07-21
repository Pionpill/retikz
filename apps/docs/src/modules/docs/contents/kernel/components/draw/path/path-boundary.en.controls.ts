import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PathBoundaryControlId, PathBoundaryVisibleWhen } from './path-boundary.controls';

/** English property panel for the Path endpoint connection surface */
export const pathBoundaryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Endpoint surface',
  sections: [
    {
      label: 'Endpoint',
      controls: [
        {
          kind: 'select',
          id: PathBoundaryControlId.Boundary,
          label: 'Surface',
          defaultValue: 'circle',
          options: [
            { value: 'shape', label: 'Star outline' },
            { value: 'circle', label: 'Circle boundary' },
          ],
        },
        {
          kind: 'select',
          id: PathBoundaryControlId.Fit,
          label: 'fit',
          defaultValue: 'tight',
          options: [
            { value: 'tight', label: 'Fit shape' },
            { value: 'bounds', label: 'Enclose bounds' },
          ],
          visibleWhen: PathBoundaryVisibleWhen.RegularBoundary,
        },
        {
          kind: 'range',
          id: PathBoundaryControlId.Gap,
          label: 'gap',
          defaultValue: 0,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: PathBoundaryVisibleWhen.RegularBoundary,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: pathBoundaryControls,
  canonicalValues: { boundary: 'circle', fit: 'tight', gap: 0 },
  relatedApis: ['Draw.way', 'IRNodeTarget.boundary', 'IRBoundary.params.fit', 'IRBoundary.params.gap'],
} satisfies PreviewControlContract;
