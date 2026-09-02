import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PathLabelRoutePlaygroundControlId } from './path-label-route-playground.controls';

/** English property panel for the Path label route playground */
export const pathLabelRoutePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path label',
  sections: [
    {
      label: 'Connection route',
      controls: [
        {
          kind: 'select',
          id: PathLabelRoutePlaygroundControlId.Route,
          label: 'Route',
          defaultValue: 'line',
          options: [
            { value: 'line', label: 'Line' },
            { value: 'fold', label: 'Right-angle fold' },
            { value: 'curve', label: 'Quadratic Bezier' },
            { value: 'cubic', label: 'Cubic Bezier' },
            { value: 'bend', label: 'Bend shorthand' },
            { value: 'smooth', label: 'Smooth through points' },
          ],
        },
      ],
    },
    {
      label: 'Label',
      controls: [
        {
          kind: 'select',
          id: PathLabelRoutePlaygroundControlId.Side,
          label: 'Side',
          defaultValue: 'center',
          options: [
            { value: 'center', label: 'Automatic center (sloped)' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        {
          kind: 'range',
          id: PathLabelRoutePlaygroundControlId.Position,
          label: 'Position',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: pathLabelRoutePlaygroundControls,
  canonicalValues: { route: 'line', side: 'center', position: 0.5 },
  relatedApis: ['Path.label', 'Step.kind', 'IRGeometryLabel.side', 'IRGeometryLabel.position'],
} satisfies PreviewControlContract;
