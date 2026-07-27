import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { temperature } from './coordinate-switch.data';

/** English controls for the 2D coordinate switch example */
export const coordinateSwitchControls = definePreviewControls({
  presentation: 'panel',
  title: '2D coordinates',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Monthly temperature',
          rows: temperature,
          columns: [
            { key: 'month', label: 'Month' },
            { key: 'value', label: 'Temperature' },
          ],
        },
      ],
    },
    {
      label: 'Coordinate shape',
      controls: [
        {
          kind: 'select',
          id: 'coordinate',
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
        {
          kind: 'range',
          id: 'innerRadius',
          label: 'Inner radius',
          defaultValue: 0,
          min: 0,
          max: 0.75,
          step: 0.05,
          visibleWhen: { controlId: 'coordinate', oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: 'Plot area',
      controls: [
        {
          kind: 'range',
          id: 'marginTop',
          label: 'Top margin',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginRight',
          label: 'Right margin',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginBottom',
          label: 'Bottom margin',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginLeft',
          label: 'Left margin',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the 2D coordinate switch example */
export const previewControlContract = {
  controls: coordinateSwitchControls,
  canonicalValues: {
    coordinate: 'cartesian2D',
    innerRadius: 0,
    marginTop: 24,
    marginRight: 24,
    marginBottom: 24,
    marginLeft: 24,
  },
  presets: [
    {
      id: 'cartesian',
      label: 'Cartesian',
      values: {
        coordinate: 'cartesian2D',
        innerRadius: 0,
        marginTop: 24,
        marginRight: 24,
        marginBottom: 24,
        marginLeft: 24,
      },
    },
    {
      id: 'polar',
      label: 'Polar',
      values: {
        coordinate: 'polar2D',
        innerRadius: 0,
        marginTop: 24,
        marginRight: 24,
        marginBottom: 24,
        marginLeft: 24,
      },
    },
  ],
  relatedApis: ['Plot.coordinate', 'Plot.margin'],
} satisfies PreviewControlContract;
