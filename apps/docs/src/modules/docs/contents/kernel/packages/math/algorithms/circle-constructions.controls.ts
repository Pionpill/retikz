import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { circleConstructionsI18n } from './circle-constructions.i18n';

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
export const createCircleConstructionsControls = (i18n: typeof circleConstructionsI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'select',
            id: CircleConstructionsControlId.Scheme,
            label: i18n.label3,
            defaultValue: 'circumcircle',
            options: [
              { value: 'circumcircle', label: i18n.label4 },
              { value: 'incircle', label: i18n.label5 },
              { value: 'minimalEnclosing', label: i18n.label6 },
            ],
          },
        ],
      },
      {
        label: i18n.label7,
        visibleWhen: CircleConstructionsVisibleWhen.Triangle,
        controls: [
          {
            kind: 'point',
            id: CircleConstructionsControlId.TriangleA,
            label: i18n.label8,
            defaultValue: [-65, 40],
            min: [-110, -70],
            max: [110, 70],
            step: 5,
          },
          {
            kind: 'point',
            id: CircleConstructionsControlId.TriangleB,
            label: i18n.label9,
            defaultValue: [0, -45],
            min: [-110, -70],
            max: [110, 70],
            step: 5,
          },
          {
            kind: 'point',
            id: CircleConstructionsControlId.TriangleC,
            label: i18n.label10,
            defaultValue: [75, 38],
            min: [-110, -70],
            max: [110, 70],
            step: 5,
          },
        ],
      },
      {
        label: i18n.label11,
        visibleWhen: CircleConstructionsVisibleWhen.PointSet,
        controls: [
          {
            kind: 'point',
            id: CircleConstructionsControlId.PointA,
            label: i18n.label12,
            defaultValue: [-85, 15],
            min: [-120, -60],
            max: [120, 60],
            step: 5,
          },
          {
            kind: 'point',
            id: CircleConstructionsControlId.PointB,
            label: i18n.label13,
            defaultValue: [-40, -55],
            min: [-120, -60],
            max: [120, 60],
            step: 5,
          },
          {
            kind: 'point',
            id: CircleConstructionsControlId.PointC,
            label: i18n.label14,
            defaultValue: [10, -25],
            min: [-120, -60],
            max: [120, 60],
            step: 5,
          },
          {
            kind: 'point',
            id: CircleConstructionsControlId.PointD,
            label: i18n.label15,
            defaultValue: [70, 10],
            min: [-120, -60],
            max: [120, 60],
            step: 5,
          },
          {
            kind: 'point',
            id: CircleConstructionsControlId.PointE,
            label: i18n.label16,
            defaultValue: [85, 18],
            min: [-120, -60],
            max: [120, 60],
            step: 5,
          },
        ],
      },
    ],
  });

export const circleConstructionsControls = createCircleConstructionsControls(circleConstructionsI18n.zh);

/** 圆构造 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = circleConstructionsI18n[lang];

  return {
    controls: createCircleConstructionsControls(i18n),
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
    relatedApis: ['Circle', 'triangle.circumCircle', 'triangle.incircle', 'circle.minimalEnclosing'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
