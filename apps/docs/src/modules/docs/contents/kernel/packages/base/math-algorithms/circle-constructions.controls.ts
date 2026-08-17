import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 圆构造 playground 的稳定字段 id */
export const CircleConstructionsControlId = {
  Scheme: 'scheme',
  TriangleA: 'triangleA',
  TriangleB: 'triangleB',
  TriangleC: 'triangleC',
  PointA: 'pointA',
  PointB: 'pointB',
  PointC: 'pointC',
  PointD: 'pointD',
  PointE: 'pointE',
} as const;

/** 圆构造方案对应的共享显示条件 */
export const CircleConstructionsVisibleWhen = {
  Triangle: { controlId: CircleConstructionsControlId.Scheme, oneOf: ['circumcircle', 'incircle'] },
  PointSet: { controlId: CircleConstructionsControlId.Scheme, oneOf: ['minimalEnclosing'] },
} as const;

/** 圆构造方案与控制点面板 */
export const circleConstructionsControls = definePreviewControls({
  presentation: 'panel',
  title: '圆与三角形',
  sections: [
    {
      label: '方案',
      controls: [
        {
          kind: 'select',
          id: CircleConstructionsControlId.Scheme,
          label: '构造方式',
          defaultValue: 'circumcircle',
          options: [
            { value: 'circumcircle', label: '三角形外接圆' },
            { value: 'incircle', label: '三角形内切圆' },
            { value: 'minimalEnclosing', label: '点集最小包围圆' },
          ],
        },
      ],
    },
    {
      label: '三角形控制点',
      visibleWhen: CircleConstructionsVisibleWhen.Triangle,
      controls: [
        {
          kind: 'point',
          id: CircleConstructionsControlId.TriangleA,
          label: '点 A',
          defaultValue: [-65, 40],
          min: [-110, -70],
          max: [110, 70],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.TriangleB,
          label: '点 B',
          defaultValue: [0, -45],
          min: [-110, -70],
          max: [110, 70],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.TriangleC,
          label: '点 C',
          defaultValue: [75, 38],
          min: [-110, -70],
          max: [110, 70],
          step: 5,
        },
      ],
    },
    {
      label: '点集控制点',
      visibleWhen: CircleConstructionsVisibleWhen.PointSet,
      controls: [
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointA,
          label: '点 1',
          defaultValue: [-85, 15],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointB,
          label: '点 2',
          defaultValue: [-40, -55],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointC,
          label: '点 3',
          defaultValue: [10, -25],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointD,
          label: '点 4',
          defaultValue: [70, 10],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
        {
          kind: 'point',
          id: CircleConstructionsControlId.PointE,
          label: '点 5',
          defaultValue: [85, 18],
          min: [-120, -60],
          max: [120, 60],
          step: 5,
        },
      ],
    },
  ],
});

/** 圆构造 playground 的稳定状态、预设与 API 覆盖 */
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
