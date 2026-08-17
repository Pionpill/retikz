import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CoordinateSpacesControlId } from './coordinate-spaces.controls';

/** Stable field ids for the coordinate-spaces playground */
export const coordinateSpacesControls = definePreviewControls({
  presentation: 'panel',
  title: 'Coordinate transform',
  sections: [
    {
      label: 'Shape position',
      controls: [
        {
          kind: 'range',
          id: CoordinateSpacesControlId.CenterX,
          label: 'Center x',
          defaultValue: 70,
          min: 30,
          max: 100,
          step: 5,
        },
        {
          kind: 'range',
          id: CoordinateSpacesControlId.CenterY,
          label: 'Center y',
          defaultValue: 35,
          min: -20,
          max: 50,
          step: 5,
        },
        {
          kind: 'range',
          id: CoordinateSpacesControlId.Rotation,
          label: 'Rotation (degrees)',
          defaultValue: 30,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
    {
      label: 'Local point',
      controls: [
        {
          kind: 'range',
          id: CoordinateSpacesControlId.LocalX,
          label: 'Local x',
          defaultValue: 40,
          min: -50,
          max: 50,
          step: 5,
        },
        {
          kind: 'range',
          id: CoordinateSpacesControlId.LocalY,
          label: 'Local y',
          defaultValue: 0,
          min: -30,
          max: 30,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable state and API coverage for the coordinate-spaces playground */
export const previewControlContract = {
  controls: coordinateSpacesControls,
  canonicalValues: { centerX: 70, centerY: 35, rotation: 30, localX: 40, localY: 0 },
  presets: [
    {
      id: 'axis-aligned',
      label: 'No rotation',
      values: { centerX: 70, centerY: 35, rotation: 0, localX: 40, localY: 0 },
    },
    {
      id: 'rotated',
      label: 'Rotated shape',
      values: { centerX: 70, centerY: 35, rotation: 30, localX: 40, localY: 0 },
    },
    {
      id: 'offset-point',
      label: 'Offset local point',
      values: { centerX: 70, centerY: 35, rotation: 30, localX: 25, localY: -25 },
    },
  ],
  relatedApis: ['CenteredShape', 'localToWorld'],
} satisfies PreviewControlContract;
