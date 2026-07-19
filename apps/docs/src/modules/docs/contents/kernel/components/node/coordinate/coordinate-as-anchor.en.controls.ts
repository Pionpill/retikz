import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { CoordinateAsAnchorControlId } from './coordinate-as-anchor.controls';

/** Coordinate virtual-anchor property panel in English */
export const coordinateAsAnchorControls = definePreviewControls({
  presentation: 'panel',
  title: 'Virtual anchor',
  sections: [
    {
      label: 'position',
      controls: [
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.PositionX,
          label: 'position x',
          defaultValue: 0,
          min: -30,
          max: 30,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.PositionY,
          label: 'position y',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 10,
        },
      ],
    },
    {
      label: 'distance',
      controls: [
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.HorizontalDistance,
          label: 'distance x',
          defaultValue: 110,
          min: 80,
          max: 130,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateAsAnchorControlId.VerticalDistance,
          label: 'distance y',
          defaultValue: 65,
          min: 50,
          max: 80,
          step: 5,
        },
      ],
    },
  ],
});
