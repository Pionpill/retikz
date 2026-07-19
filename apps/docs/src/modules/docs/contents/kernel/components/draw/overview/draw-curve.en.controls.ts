import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { DrawCurveControlId, DrawCurveVisibleWhen } from './draw-curve.controls';

/** Draw curve playground controls in English */
export const drawCurveEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw curves',
  sections: [
    {
      label: 'Curve type',
      controls: [
        {
          kind: 'select',
          id: DrawCurveControlId.Kind,
          label: 'way operator',
          defaultValue: 'curve',
          options: [
            { value: 'curve', label: 'Quadratic Bezier' },
            { value: 'cubic', label: 'Cubic Bezier' },
            { value: 'bend', label: 'Bend shorthand' },
            { value: 'arc', label: 'Arc' },
            { value: 'circle', label: 'Full circle' },
            { value: 'ellipse', label: 'Full ellipse' },
          ],
        },
      ],
    },
    {
      label: 'Bezier parameters',
      controls: [
        {
          kind: 'point',
          id: DrawCurveControlId.Control,
          label: 'Control point',
          defaultValue: [100, -70],
          min: [0, -100],
          max: [200, 100],
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Curve,
        },
        {
          kind: 'point',
          id: DrawCurveControlId.Control1,
          label: 'Control point 1',
          defaultValue: [60, -70],
          min: [0, -100],
          max: [200, 100],
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Cubic,
        },
        {
          kind: 'point',
          id: DrawCurveControlId.Control2,
          label: 'Control point 2',
          defaultValue: [140, 70],
          min: [0, -100],
          max: [200, 100],
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Cubic,
        },
      ],
    },
    {
      label: 'Bend and arc',
      controls: [
        {
          kind: 'select',
          id: DrawCurveControlId.BendDirection,
          label: 'Bend direction',
          defaultValue: 'left',
          visibleWhen: DrawCurveVisibleWhen.Bend,
          options: [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        {
          kind: 'range',
          id: DrawCurveControlId.BendAngle,
          label: 'Bend angle',
          defaultValue: 30,
          min: 5,
          max: 80,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Bend,
        },
        {
          kind: 'range',
          id: DrawCurveControlId.StartAngle,
          label: 'Start angle',
          defaultValue: 0,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Arc,
        },
        {
          kind: 'range',
          id: DrawCurveControlId.EndAngle,
          label: 'End angle',
          defaultValue: 120,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Arc,
        },
      ],
    },
    {
      label: 'Radius',
      controls: [
        {
          kind: 'range',
          id: DrawCurveControlId.Radius,
          label: 'Radius',
          defaultValue: 60,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: {
            controlId: DrawCurveControlId.Kind,
            oneOf: ['arc', 'circle'],
          },
        },
        {
          kind: 'range',
          id: DrawCurveControlId.RadiusX,
          label: 'Radius x',
          defaultValue: 80,
          min: 20,
          max: 100,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Ellipse,
        },
        {
          kind: 'range',
          id: DrawCurveControlId.RadiusY,
          label: 'Radius y',
          defaultValue: 45,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Ellipse,
        },
      ],
    },
  ],
});
