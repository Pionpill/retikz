import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { StepCurveControlId, StepCurveVisibleWhen } from './step-curves.controls';

/** Step curve controls in English */
export const stepCurvesEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step curves',
  sections: [
    {
      label: 'Curve type',
      controls: [
        {
          kind: 'select',
          id: StepCurveControlId.Kind,
          label: 'kind',
          defaultValue: 'curve',
          options: [
            { value: 'curve', label: 'Quadratic Bezier' },
            { value: 'cubic', label: 'Cubic Bezier' },
            { value: 'bend', label: 'Bend shorthand' },
            { value: 'smooth', label: 'Smooth through points' },
            { value: 'arc', label: 'Arc' },
            { value: 'circlePath', label: 'Full circle' },
            { value: 'ellipsePath', label: 'Full ellipse' },
          ],
        },
      ],
    },
    {
      label: 'Bezier and smooth',
      controls: [
        {
          kind: 'point',
          id: StepCurveControlId.Control,
          label: 'Control point',
          defaultValue: [0, -70],
          min: [-100, -100],
          max: [100, 100],
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Curve,
        },
        {
          kind: 'point',
          id: StepCurveControlId.Control1,
          label: 'Control point 1',
          defaultValue: [-40, -70],
          min: [-100, -100],
          max: [100, 100],
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Cubic,
        },
        {
          kind: 'point',
          id: StepCurveControlId.Control2,
          label: 'Control point 2',
          defaultValue: [40, 70],
          min: [-100, -100],
          max: [100, 100],
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Cubic,
        },
        {
          kind: 'select',
          id: StepCurveControlId.BendDirection,
          label: 'Bend direction',
          defaultValue: 'left',
          visibleWhen: StepCurveVisibleWhen.Bend,
          options: [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        {
          kind: 'range',
          id: StepCurveControlId.BendAngle,
          label: 'Bend angle',
          defaultValue: 30,
          min: 5,
          max: 80,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Bend,
        },
        {
          kind: 'range',
          id: StepCurveControlId.Tension,
          label: 'tension',
          defaultValue: 1,
          min: 0.2,
          max: 2,
          step: 0.1,
          visibleWhen: StepCurveVisibleWhen.Smooth,
        },
      ],
    },
    {
      label: 'Angles and radii',
      controls: [
        {
          kind: 'range',
          id: StepCurveControlId.StartAngle,
          label: 'Start angle',
          defaultValue: 0,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Arc,
        },
        {
          kind: 'range',
          id: StepCurveControlId.EndAngle,
          label: 'End angle',
          defaultValue: 120,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Arc,
        },
        {
          kind: 'range',
          id: StepCurveControlId.Radius,
          label: 'Radius',
          defaultValue: 60,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: { controlId: StepCurveControlId.Kind, oneOf: ['arc', 'circlePath'] },
        },
        {
          kind: 'range',
          id: StepCurveControlId.RadiusX,
          label: 'Radius x',
          defaultValue: 80,
          min: 20,
          max: 100,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Ellipse,
        },
        {
          kind: 'range',
          id: StepCurveControlId.RadiusY,
          label: 'Radius y',
          defaultValue: 45,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Ellipse,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: stepCurvesEnControls,
  canonicalValues: {
    stepKind: 'curve',
    control: [0, -70],
    control1: [-40, -70],
    control2: [40, 70],
    bendDirection: 'left',
    bendAngle: 30,
    tension: 1,
    startAngle: 0,
    endAngle: 120,
    radius: 60,
    radiusX: 80,
    radiusY: 45,
  },
  relatedApis: ['Step.kind', 'Step.to'],
} satisfies PreviewControlContract;
