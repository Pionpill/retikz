import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CircleConstructionsControlId, CircleConstructionsVisibleWhen } from './circle-constructions.controls';

/** English controls for circle construction schemes and control points */
export const circleConstructionsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Circles and triangles',
  sections: [
    {
      label: 'Scheme',
      controls: [
        {
          kind: 'select',
          id: CircleConstructionsControlId.Scheme,
          label: 'Construction',
          defaultValue: 'circumcircle',
          options: [
            { value: 'circumcircle', label: 'Triangle circumcircle' },
            { value: 'incircle', label: 'Triangle incircle' },
            { value: 'minimalEnclosing', label: 'Minimal enclosing circle' },
          ],
        },
      ],
    },
    {
      label: 'Triangle points',
      visibleWhen: CircleConstructionsVisibleWhen.Triangle,
      controls: [
        {
          kind: 'point',
          id: CircleConstructionsControlId.TriangleA,
          label: 'Point A',
          defaultValue: [-65, 40],
          min: [-110, -70],
          max: [110, 70],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.TriangleB,
          label: 'Point B',
          defaultValue: [0, -45],
          min: [-110, -70],
          max: [110, 70],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.TriangleC,
          label: 'Point C',
          defaultValue: [75, 38],
          min: [-110, -70],
          max: [110, 70],
          step: 5,
        },
      ],
    },
    {
      label: 'Point-set points',
      visibleWhen: CircleConstructionsVisibleWhen.PointSet,
      controls: [
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointA,
          label: 'Point 1',
          defaultValue: [-85, 15],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointB,
          label: 'Point 2',
          defaultValue: [-40, -55],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointC,
          label: 'Point 3',
          defaultValue: [10, -25],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointD,
          label: 'Point 4',
          defaultValue: [70, 10],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointE,
          label: 'Point 5',
          defaultValue: [85, 18],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English circle-construction playground */
export const previewControlContract = {
  controls: circleConstructionsControls,
  canonicalValues: {
    scheme: 'circumcircle',
    triangleA: [-65, 40],
    triangleB: [0, -45],
    triangleC: [75, 38],
    pointA: [-85, 15],
    pointB: [-40, -55],
    pointC: [10, -25],
    pointD: [70, 10],
    pointE: [85, 18],
  },
  relatedApis: ['Circle', 'triangle.circumCircle', 'triangle.inCircle', 'circle.minimalEnclosing'],
} satisfies PreviewControlContract;
