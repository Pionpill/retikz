import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EllipseArcPlaygroundControlId } from './ellipse-arc-playground.controls';

/** English controls for drawing an ellipse and an arc with their bounds */
export const ellipseArcPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ellipse and arc',
  sections: [
    {
      label: 'Ellipse',
      controls: [
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.EllipseRadiusX,
          label: 'horizontal radius',
          defaultValue: 45,
          min: 30,
          max: 65,
          step: 5,
        },
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.EllipseRadiusY,
          label: 'vertical radius',
          defaultValue: 28,
          min: 20,
          max: 50,
          step: 2,
        },
      ],
    },
    {
      label: 'Arc',
      controls: [
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.ArcRadius,
          label: 'radius',
          defaultValue: 42,
          min: 25,
          max: 60,
          step: 5,
        },
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.ArcStartAngle,
          label: 'start angle',
          defaultValue: 25,
          min: 0,
          max: 270,
          step: 5,
        },
        {
          kind: 'range',
          id: EllipseArcPlaygroundControlId.ArcEndAngle,
          label: 'end angle',
          defaultValue: 250,
          min: 90,
          max: 350,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English ellipse-arc playground */
export const previewControlContract = {
  controls: ellipseArcPlaygroundControls,
  canonicalValues: { ellipseRadiusX: 45, ellipseRadiusY: 28, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 250 },
  presets: [
    {
      id: 'balanced',
      label: 'Balanced shapes',
      values: { ellipseRadiusX: 45, ellipseRadiusY: 28, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 250 },
    },
    {
      id: 'tall-ellipse',
      label: 'Tall ellipse',
      values: { ellipseRadiusX: 35, ellipseRadiusY: 48, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 145 },
    },
    {
      id: 'long-arc',
      label: 'Long arc',
      values: { ellipseRadiusX: 58, ellipseRadiusY: 24, arcRadius: 52, arcStartAngle: 20, arcEndAngle: 300 },
    },
  ],
  relatedApis: ['ellipse.inscribedInBox', 'ellipse.center', 'arcBoundingPoints', 'boundsOf', 'boundsToRect'],
} satisfies PreviewControlContract;
