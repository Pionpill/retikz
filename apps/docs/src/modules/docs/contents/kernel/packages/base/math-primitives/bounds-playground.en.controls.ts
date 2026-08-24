import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { BoundsPlaygroundControlId } from './bounds-playground.controls';

/** English controls for editing points and observing their bounds */
export const boundsPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Bounds calculations',
  sections: [
    {
      label: 'Point A',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.AX,
          label: 'x coordinate',
          defaultValue: -70,
          min: -100,
          max: 100,
          step: 10,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.AY,
          label: 'y coordinate',
          defaultValue: -20,
          min: -80,
          max: 80,
          step: 10,
        },
      ],
    },
    {
      label: 'Point B',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.BX,
          label: 'x coordinate',
          defaultValue: 0,
          min: -100,
          max: 100,
          step: 10,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.BY,
          label: 'y coordinate',
          defaultValue: 50,
          min: -80,
          max: 80,
          step: 10,
        },
      ],
    },
    {
      label: 'Point C',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.CX,
          label: 'x coordinate',
          defaultValue: 70,
          min: -100,
          max: 100,
          step: 10,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.CY,
          label: 'y coordinate',
          defaultValue: -10,
          min: -80,
          max: 80,
          step: 10,
        },
      ],
    },
    {
      label: 'Arc',
      controls: [
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.ARC_START_ANGLE,
          label: 'start angle',
          defaultValue: 200,
          min: 0,
          max: 270,
          step: 5,
        },
        {
          kind: 'range',
          id: BoundsPlaygroundControlId.ARC_END_ANGLE,
          label: 'end angle',
          defaultValue: 340,
          min: 90,
          max: 350,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English bounds playground */
export const previewControlContract = {
  controls: boundsPlaygroundControls,
  canonicalValues: {
    aX: -70,
    aY: -20,
    bX: 0,
    bY: 50,
    cX: 70,
    cY: -10,
    arcStartAngle: 200,
    arcEndAngle: 340,
  },
  presets: [
    {
      id: 'triangle',
      label: 'Triangle points',
      values: {
        aX: -70,
        aY: -20,
        bX: 0,
        bY: 50,
        cX: 70,
        cY: -10,
        arcStartAngle: 200,
        arcEndAngle: 340,
      },
    },
    {
      id: 'wide',
      label: 'Wide spread',
      values: {
        aX: -100,
        aY: 20,
        bX: 0,
        bY: -35,
        cX: 100,
        cY: 25,
        arcStartAngle: 200,
        arcEndAngle: 340,
      },
    },
    {
      id: 'vertical',
      label: 'Tall spread',
      values: {
        aX: -25,
        aY: -70,
        bX: 55,
        bY: 0,
        cX: -10,
        cY: 70,
        arcStartAngle: 270,
        arcEndAngle: 90,
      },
    },
  ],
  relatedApis: ['collectArcBoundingCandidates', 'boundsOf', 'boundsToRect'],
} satisfies PreviewControlContract;
