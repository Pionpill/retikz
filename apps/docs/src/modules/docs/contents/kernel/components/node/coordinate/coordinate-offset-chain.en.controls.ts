import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { CoordinateOffsetChainControlId } from './coordinate-offset-chain.controls';

/** Coordinate offset-chain property panel in English */
export const coordinateOffsetChainControls = definePreviewControls({
  presentation: 'panel',
  title: 'Offset chain',
  sections: [
    {
      label: 'position',
      controls: [
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.RootX,
          label: 'position x',
          defaultValue: -140,
          min: -170,
          max: -90,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.RootY,
          label: 'position y',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
      ],
    },
    {
      label: 'offset',
      controls: [
        {
          kind: 'range',
          id: CoordinateOffsetChainControlId.StepX,
          label: 'offset x',
          defaultValue: 120,
          min: 80,
          max: 140,
          step: 10,
        },
      ],
    },
  ],
});
