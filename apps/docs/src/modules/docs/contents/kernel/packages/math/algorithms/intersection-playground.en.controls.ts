import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { IntersectionControlId, IntersectionVisibleWhen } from './intersection-playground.controls';

/** English controls for intersection algorithms and geometry inputs */
export const intersectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Intersections',
  sections: [
    {
      label: 'Algorithm',
      controls: [
        {
          kind: 'select',
          id: IntersectionControlId.Kind,
          label: 'Type',
          defaultValue: 'lineCircle',
          options: [
            { value: 'lineLine', label: 'Line / line' },
            { value: 'segmentSegment', label: 'Segment / segment' },
            { value: 'lineCircle', label: 'Line / circle' },
            { value: 'circleCircle', label: 'Circle / circle' },
          ],
        },
      ],
    },
    {
      label: 'Geometry input',
      controls: [
        {
          kind: 'range',
          id: IntersectionControlId.Offset,
          label: 'Offset',
          defaultValue: 25,
          min: -100,
          max: 100,
          step: 5,
        },
        {
          kind: 'range',
          id: IntersectionControlId.Angle,
          label: 'Angle',
          defaultValue: 65,
          min: 0,
          max: 180,
          step: 5,
          visibleWhen: IntersectionVisibleWhen.LineLine,
        },
        {
          kind: 'range',
          id: IntersectionControlId.Radius,
          label: 'Radius',
          defaultValue: 70,
          min: 30,
          max: 90,
          step: 5,
          visibleWhen: IntersectionVisibleWhen.Circle,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English intersection playground */
export const previewControlContract = {
  controls: intersectionPlaygroundControls,
  canonicalValues: { kind: 'lineCircle', offset: 25, angle: 65, radius: 70 },
  presetSelector: { label: 'Scenario', customLabel: 'Custom' },
  presets: [
    {
      id: 'crossing-lines',
      label: 'Crossing lines',
      values: { kind: 'lineLine', offset: 10, angle: 65, radius: 70 },
    },
    {
      id: 'line-intersection-beyond-strokes',
      label: 'Line intersection beyond strokes',
      values: { kind: 'lineLine', offset: 75, angle: 25, radius: 70 },
    },
    {
      id: 'disjoint-segments',
      label: 'Disjoint segments',
      values: { kind: 'segmentSegment', offset: 75, angle: 25, radius: 70 },
    },
    {
      id: 'parallel-lines',
      label: 'Parallel lines',
      values: { kind: 'lineLine', offset: 45, angle: 0, radius: 70 },
    },
    {
      id: 'tangent-line-circle',
      label: 'Line tangent to circle',
      values: { kind: 'lineCircle', offset: 70, angle: 65, radius: 70 },
    },
    {
      id: 'disjoint-circles',
      label: 'Disjoint circles',
      values: { kind: 'circleCircle', offset: 70, angle: 65, radius: 55 },
    },
  ],
  relatedApis: ['intersect.lineLine', 'intersect.segmentSegment', 'intersect.lineCircle', 'intersect.circleCircle'],
} satisfies PreviewControlContract;
