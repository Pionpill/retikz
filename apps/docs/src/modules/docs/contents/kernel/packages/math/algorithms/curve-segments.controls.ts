import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { curveSegmentsI18n } from './curve-segments.i18n';

/** 曲线段 playground 的稳定字段 id */
export const CurveSegmentsControlId = {
  Kind: 'kind',
  SampleParameter: 'sampleParameter',
  SliceStart: 'sliceStart',
  SliceEnd: 'sliceEnd',
} as const;

/** 曲线段采样与切片的中文属性面板 */
export const createCurveSegmentsControls = (i18n: typeof curveSegmentsI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'select',
            id: CurveSegmentsControlId.Kind,
            label: i18n.label3,
            defaultValue: 'cubicBezier',
            options: [
              { value: 'line', label: i18n.label4 },
              { value: 'quadraticBezier', label: i18n.label5 },
              { value: 'cubicBezier', label: i18n.label6 },
              { value: 'arc', label: i18n.label7 },
              { value: 'ellipseArc', label: i18n.label8 },
            ],
          },
        ],
      },
      {
        label: i18n.label9,
        controls: [
          {
            kind: 'range',
            id: CurveSegmentsControlId.SampleParameter,
            label: i18n.label10,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'range',
            id: CurveSegmentsControlId.SliceStart,
            label: i18n.label11,
            defaultValue: 0.28,
            min: 0,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'range',
            id: CurveSegmentsControlId.SliceEnd,
            label: i18n.label12,
            defaultValue: 0.74,
            min: 0,
            max: 1,
            step: 0.05,
          },
        ],
      },
    ],
  });

export const curveSegmentsControls = createCurveSegmentsControls(curveSegmentsI18n.zh);

/** 曲线段 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = curveSegmentsI18n[lang];

  return {
    controls: createCurveSegmentsControls(i18n),
    canonicalValues: { kind: 'cubicBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    presets: [
      {
        id: 'line',
        label: i18n.label13,
        values: { kind: 'line', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
      },
      {
        id: 'quadratic-bezier',
        label: i18n.label14,
        values: { kind: 'quadraticBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
      },
      {
        id: 'cubic-bezier',
        label: i18n.label15,
        values: { kind: 'cubicBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
      },
      {
        id: 'arc',
        label: i18n.label16,
        values: { kind: 'arc', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
      },
      {
        id: 'ellipse-arc',
        label: i18n.label17,
        values: { kind: 'ellipseArc', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
      },
    ],
    relatedApis: ['CurveSegment', 'CurveSegmentSample', 'curve.sampleAt', 'curve.slice'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
