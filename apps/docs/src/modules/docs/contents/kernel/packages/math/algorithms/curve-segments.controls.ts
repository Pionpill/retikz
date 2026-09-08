import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 曲线段 playground 的稳定字段 id */
export const CurveSegmentsControlId = {
  Kind: 'kind',
  SampleParameter: 'sampleParameter',
  SliceStart: 'sliceStart',
  SliceEnd: 'sliceEnd',
} as const;

/** 曲线段采样与切片的中文属性面板 */
export const curveSegmentsControls = definePreviewControls({
  presentation: 'panel',
  title: '曲线段采样与切片',
  sections: [
    {
      label: '曲线',
      controls: [
        {
          kind: 'select',
          id: CurveSegmentsControlId.Kind,
          label: '类型',
          defaultValue: 'cubicBezier',
          options: [
            { value: 'line', label: '直线' },
            { value: 'quadraticBezier', label: '二次贝塞尔' },
            { value: 'cubicBezier', label: '三次贝塞尔' },
            { value: 'arc', label: '圆弧' },
            { value: 'ellipseArc', label: '椭圆弧' },
          ],
        },
      ],
    },
    {
      label: '参数区间',
      controls: [
        {
          kind: 'range',
          id: CurveSegmentsControlId.SampleParameter,
          label: '采样位置',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: CurveSegmentsControlId.SliceStart,
          label: '切片起点',
          defaultValue: 0.28,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: CurveSegmentsControlId.SliceEnd,
          label: '切片终点',
          defaultValue: 0.74,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 曲线段 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: curveSegmentsControls,
  canonicalValues: { kind: 'cubicBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
  presets: [
    {
      id: 'line',
      label: '直线',
      values: { kind: 'line', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'quadratic-bezier',
      label: '二次贝塞尔',
      values: { kind: 'quadraticBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'cubic-bezier',
      label: '三次贝塞尔',
      values: { kind: 'cubicBezier', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'arc',
      label: '圆弧',
      values: { kind: 'arc', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
    {
      id: 'ellipse-arc',
      label: '椭圆弧',
      values: { kind: 'ellipseArc', sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 },
    },
  ],
  relatedApis: ['CurveSegment', 'CurveSegmentSample', 'curve.sampleAt', 'curve.slice'],
} satisfies PreviewControlContract;
