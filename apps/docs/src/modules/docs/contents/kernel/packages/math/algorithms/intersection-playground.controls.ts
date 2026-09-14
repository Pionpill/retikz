import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { intersectionPlaygroundI18n } from './intersection-playground.i18n';
import { definePreviewControls } from '@/modules/docs/preview';

/** 求交 playground 的稳定字段 id */
export const IntersectionControlId = {
  Kind: 'kind',
  Offset: 'offset',
  Angle: 'angle',
  Radius: 'radius',
} as const;

/** 求交算法分支对应的共享显示条件 */
export const IntersectionVisibleWhen = {
  LineLine: { controlId: IntersectionControlId.Kind, oneOf: ['lineLine', 'segmentSegment'] },
  Circle: { controlId: IntersectionControlId.Kind, oneOf: ['lineCircle', 'circleCircle'] },
} as const;

/** 求交算法与几何输入的中文属性面板 */
export const createIntersectionPlaygroundControls = (i18n: typeof intersectionPlaygroundI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'select',
            id: IntersectionControlId.Kind,
            label: i18n.label3,
            defaultValue: 'lineCircle',
            options: [
              { value: 'lineLine', label: i18n.label4 },
              { value: 'segmentSegment', label: i18n.label5 },
              { value: 'lineCircle', label: i18n.label6 },
              { value: 'circleCircle', label: i18n.label7 },
            ],
          },
        ],
      },
      {
        label: i18n.label8,
        controls: [
          {
            kind: 'range',
            id: IntersectionControlId.Offset,
            label: i18n.label9,
            defaultValue: 25,
            min: -100,
            max: 100,
            step: 5,
          },
          {
            kind: 'range',
            id: IntersectionControlId.Angle,
            label: i18n.label10,
            defaultValue: 65,
            min: 0,
            max: 180,
            step: 5,
            visibleWhen: IntersectionVisibleWhen.LineLine,
          },
          {
            kind: 'range',
            id: IntersectionControlId.Radius,
            label: i18n.label11,
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

export const intersectionPlaygroundControls = createIntersectionPlaygroundControls(intersectionPlaygroundI18n.zh);

/** 求交 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = intersectionPlaygroundI18n[lang];

  return {
    controls: createIntersectionPlaygroundControls(i18n),
    canonicalValues: { kind: 'lineCircle', offset: 25, angle: 65, radius: 70 },
    presetSelector: { label: i18n.label12, customLabel: i18n.label13 },
    presets: [
      {
        id: 'crossing-lines',
        label: i18n.label14,
        values: { kind: 'lineLine', offset: 10, angle: 65, radius: 70 },
      },
      {
        id: 'line-intersection-beyond-strokes',
        label: i18n.label15,
        values: { kind: 'lineLine', offset: 75, angle: 25, radius: 70 },
      },
      {
        id: 'disjoint-segments',
        label: i18n.label16,
        values: { kind: 'segmentSegment', offset: 75, angle: 25, radius: 70 },
      },
      {
        id: 'parallel-lines',
        label: i18n.label17,
        values: { kind: 'lineLine', offset: 45, angle: 0, radius: 70 },
      },
      {
        id: 'tangent-line-circle',
        label: i18n.label18,
        values: { kind: 'lineCircle', offset: 70, angle: 65, radius: 70 },
      },
      {
        id: 'disjoint-circles',
        label: i18n.label19,
        values: { kind: 'circleCircle', offset: 70, angle: 65, radius: 55 },
      },
    ],
    relatedApis: ['intersect.lineLine', 'intersect.segmentSegment', 'intersect.lineCircle', 'intersect.circleCircle'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
