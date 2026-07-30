import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { closureTrend } from './line-closure.data';

/** 基线闭合 playground 的稳定控件 id */
export const LINE_CLOSURE_BASELINE_ID = 'line-closure-baseline';

/** 面积横向留白的稳定控件 id */
export const LINE_CLOSURE_HORIZONTAL_PADDING_ID = 'line-closure-horizontal-padding';

/** 面积纵向留白的稳定控件 id */
export const LINE_CLOSURE_VERTICAL_PADDING_ID = 'line-closure-vertical-padding';

/** 路径闭合 playground 的其它稳定控件 id */
export const LINE_CLOSURE_CONTROL_IDS = {
  coordinate: 'path-closure-coordinate',
  closed: 'path-closure-closed',
  mode: 'line-closure-mode',
  fillOpacity: 'line-closure-fill-opacity',
} as const;

/** 基线与循环闭合的中文属性面板 */
export const lineClosureControls = definePreviewControls({
  presentation: 'panel',
  title: '路径闭合',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'closureTrend', label: '趋势面积', rows: closureTrend }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: LINE_CLOSURE_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_CLOSURE_CONTROL_IDS.closed,
          label: '是否闭合',
          defaultValue: false,
          visibleWhen: { controlId: LINE_CLOSURE_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: '闭合与填充',
      controls: [
        {
          kind: 'select',
          id: LINE_CLOSURE_CONTROL_IDS.mode,
          label: '闭合方式',
          defaultValue: 'open',
          options: [
            { value: 'open', label: '开放路径' },
            { value: 'cycle', label: '首尾闭合' },
            { value: 'baseline', label: '回到基线' },
          ],
        },
        {
          kind: 'range',
          id: LINE_CLOSURE_BASELINE_ID,
          label: '基线值',
          defaultValue: 30,
          min: 0,
          max: 50,
          step: 5,
          visibleWhen: { controlId: LINE_CLOSURE_CONTROL_IDS.mode, oneOf: ['baseline'] },
        },
        {
          kind: 'range',
          id: LINE_CLOSURE_CONTROL_IDS.fillOpacity,
          label: '填充透明度',
          defaultValue: 0.24,
          min: 0.1,
          max: 0.7,
          step: 0.05,
          visibleWhen: { controlId: LINE_CLOSURE_CONTROL_IDS.mode, oneOf: ['cycle', 'baseline'] },
        },
      ],
    },
    {
      label: '面积比例尺',
      controls: [
        {
          kind: 'range',
          id: LINE_CLOSURE_HORIZONTAL_PADDING_ID,
          label: '横向留白',
          defaultValue: 0,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: LINE_CLOSURE_VERTICAL_PADDING_ID,
          label: '纵向留白',
          defaultValue: 0,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
      ],
    },
  ],
});

/** 基线与循环闭合 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineClosureControls,
  canonicalValues: {
    [LINE_CLOSURE_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_CLOSURE_CONTROL_IDS.closed]: false,
    [LINE_CLOSURE_CONTROL_IDS.mode]: 'open',
    [LINE_CLOSURE_BASELINE_ID]: 30,
    [LINE_CLOSURE_CONTROL_IDS.fillOpacity]: 0.24,
    [LINE_CLOSURE_HORIZONTAL_PADDING_ID]: 0,
    [LINE_CLOSURE_VERTICAL_PADDING_ID]: 0,
  },
  relatedApis: [
    'Plot.coordinate',
    'PathMark.closed',
    'PathMark.closure',
    'PathMark.fill',
    'Scale.padding',
    'Scale.domainPadding',
  ],
} satisfies PreviewControlContract;
