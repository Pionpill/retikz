import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { CoordinateBetweenControlId } from './coordinate-between.controls';

/** Between-position property panel in English */
export const coordinateBetweenControls = definePreviewControls({
  presentation: 'panel',
  title: 'Partway positioning',
  sections: [
    {
      label: 'between',
      controls: [
        {
          kind: 'range',
          id: CoordinateBetweenControlId.Fraction,
          label: 'fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});
