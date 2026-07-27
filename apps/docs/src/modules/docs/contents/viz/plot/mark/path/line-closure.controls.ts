import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { closureRadar, closureTrend } from './line-closure.data';

/** 基线闭合 playground 的稳定控件 id */
export const LINE_CLOSURE_BASELINE_ID = 'line-closure-baseline';

/** 面积横向留白的稳定控件 id */
export const LINE_CLOSURE_HORIZONTAL_PADDING_ID = 'line-closure-horizontal-padding';

/** 面积纵向留白的稳定控件 id */
export const LINE_CLOSURE_VERTICAL_PADDING_ID = 'line-closure-vertical-padding';

/** 基线与循环闭合的中文属性面板 */
export const lineClosureControls = definePreviewControls({
  presentation: 'panel',
  title: '路径闭合',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        { kind: 'table', id: 'closureTrend', label: '趋势面积', rows: closureTrend },
        { kind: 'table', id: 'closureRadar', label: '雷达面积', rows: closureRadar },
      ],
    },
    {
      label: '基线',
      controls: [
        {
          kind: 'range',
          id: LINE_CLOSURE_BASELINE_ID,
          label: '基线值',
          defaultValue: 30,
          min: 0,
          max: 50,
          step: 5,
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
    [LINE_CLOSURE_BASELINE_ID]: 30,
    [LINE_CLOSURE_HORIZONTAL_PADDING_ID]: 0,
    [LINE_CLOSURE_VERTICAL_PADDING_ID]: 0,
  },
  relatedApis: ['PathMark.closure', 'PathMark.fill', 'Scale.padding', 'Scale.domainPadding'],
} satisfies PreviewControlContract;
