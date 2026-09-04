import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CurveSegmentsControlId } from './curve-segments.controls';

/** English controls for sampling and slicing curve segments */
export const curveSegmentsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Curve sampling and slicing',
  sections: [
    {
      label: 'Curve',
      controls: [
        {
          kind: 'select',
          id: CurveSegmentsControlId.Kind,
          label: 'type',
          defaultValue: 'cubicBezier',
          options: [
            { value: 'line', label: 'Line' },
            { value: 'quadraticBezier', label: 'Quadratic Bézier' },
            { value: 'cubicBezier', label: 'Cubic Bézier' },
            { value: 'arc', label: 'Circular arc' },
            { value: 'ellipseArc', label: 'Elliptical arc' },
          ],
        },
      ],
    },
    {
      label: 'Parameter interval',
      controls: [
        {
          kind: 'range',
          id: CurveSegmentsControlId.SampleParameter,
          label: 'sample position',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: CurveSegmentsControlId.SliceStart,
          label: 'slice start',
          defaultValue: 0.28,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: CurveSegmentsControlId.SliceEnd,
          label: 'slice end',
          defaultValue: 0.74,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English curve-segment playground */
export const previewControlContract = {
  controls: curveSegmentsControls,
  canonicalValues: { kind: 'cubicBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
  presets: [
    {
      id: 'line',
      label: 'Line',
      values: { kind: 'line', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'quadratic-bezier',
      label: 'Quadratic Bézier',
      values: { kind: 'quadraticBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'cubic-bezier',
      label: 'Cubic Bézier',
      values: { kind: 'cubicBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'arc',
      label: 'Circular arc',
      values: { kind: 'arc', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'ellipse-arc',
      label: 'Elliptical arc',
      values: { kind: 'ellipseArc', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
  ],
  relatedApis: ['CurveSegment', 'CurveSegmentSample', 'curve.sampleAt', 'curve.slice'],
} satisfies PreviewControlContract;
