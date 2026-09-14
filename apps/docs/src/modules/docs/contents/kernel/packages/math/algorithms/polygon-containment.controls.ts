import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { polygonContainmentI18n } from './polygon-containment.i18n';

/** 多边形 playground 的稳定字段 id */
export const PolygonContainmentControlId = {
  Shape: 'shape',
  TestPointA: 'testPointA',
  TestPointB: 'testPointB',
  TestPointC: 'testPointC',
} as const;

/** 多边形形状与测试点控制面板 */
export const createPolygonContainmentControls = (i18n: typeof polygonContainmentI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'select',
            id: PolygonContainmentControlId.Shape,
            label: i18n.label3,
            defaultValue: 'concave',
            options: [
              { value: 'concave', label: i18n.label4 },
              { value: 'convex', label: i18n.label5 },
            ],
          },
        ],
      },
      {
        label: i18n.label6,
        controls: [
          {
            kind: 'point',
            id: PolygonContainmentControlId.TestPointA,
            label: i18n.label7,
            defaultValue: [0, 8],
            min: [-160, -95],
            max: [160, 95],
            step: 5,
          },
          {
            kind: 'point',
            id: PolygonContainmentControlId.TestPointB,
            label: i18n.label8,
            defaultValue: [150, 80],
            min: [-160, -95],
            max: [160, 95],
            step: 5,
          },
          {
            kind: 'point',
            id: PolygonContainmentControlId.TestPointC,
            label: i18n.label9,
            defaultValue: [0, -60],
            min: [-160, -95],
            max: [160, 95],
            step: 5,
          },
        ],
      },
    ],
  });

export const polygonContainmentControls = createPolygonContainmentControls(polygonContainmentI18n.zh);

/** 多边形 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = polygonContainmentI18n[lang];

  return {
    controls: createPolygonContainmentControls(i18n),
    canonicalValues: {
      shape: 'concave',
      testPointA: [0, 8],
      testPointB: [150, 80],
      testPointC: [0, -60],
    },
    relatedApis: ['polygon.containsPoint', 'convexHull'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
