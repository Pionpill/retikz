import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { laborCosts } from './bar-variable-width.data';
import { measurements } from './interval-histogram.data';

/** 连续区间 playground 的稳定控件 id */
export const INTERVAL_CONTINUOUS_MODE_ID = 'interval-continuous-mode';
export const INTERVAL_HISTOGRAM_COUNT_ID = 'interval-histogram-thresholds';
export const INTERVAL_CONTINUOUS_COORDINATE_ID = 'interval-continuous-coordinate';

/** 连续区间左右留白的稳定控件 id */
export const INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID = 'interval-continuous-horizontal-padding';

/** 连续区间上下留白的稳定控件 id */
export const INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID = 'interval-continuous-vertical-padding';

/** 根据实时控件值创建直方图分箱 operation */
export const intervalHistogramOperationOf = (values: { [INTERVAL_HISTOGRAM_COUNT_ID]: number }) => ({
  kind: 'bin',
  field: 'measurement',
  count: values[INTERVAL_HISTOGRAM_COUNT_ID],
});

/** 连续区间与可变宽度的中文属性面板 */
export const intervalHistogramControls = definePreviewControls({
  presentation: 'panel',
  title: '连续区间',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'measurements',
          label: '测量值',
          views: createPlotTransformTableViews(
            { source: '原始', result: '分箱后' },
            measurements,
            intervalHistogramOperationOf,
          ),
          visibleWhen: { controlId: INTERVAL_CONTINUOUS_MODE_ID, oneOf: ['histogram'] },
        },
        {
          kind: 'table',
          id: 'laborCosts',
          label: '劳动力成本',
          rows: laborCosts,
          visibleWhen: { controlId: INTERVAL_CONTINUOUS_MODE_ID, oneOf: ['proportional'] },
        },
      ],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: INTERVAL_CONTINUOUS_COORDINATE_ID,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
      ],
    },
    {
      label: '区间来源',
      controls: [
        {
          kind: 'select',
          id: INTERVAL_CONTINUOUS_MODE_ID,
          label: '模式',
          defaultValue: 'histogram',
          options: [
            { value: 'histogram', label: '直方图分箱' },
            { value: 'proportional', label: '比例宽度' },
          ],
        },
        {
          kind: 'range',
          id: INTERVAL_HISTOGRAM_COUNT_ID,
          label: '箱数',
          defaultValue: 8,
          min: 4,
          max: 16,
          step: 1,
          visibleWhen: { controlId: INTERVAL_CONTINUOUS_MODE_ID, oneOf: ['histogram'] },
        },
      ],
    },
    {
      label: '比例尺留白',
      controls: [
        {
          kind: 'range',
          id: INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID,
          label: '左右留白',
          defaultValue: 0,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
        {
          kind: 'range',
          id: INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID,
          label: '上下留白',
          defaultValue: 0,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
      ],
    },
  ],
});

/** 直方图分箱 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: intervalHistogramControls,
  canonicalValues: {
    [INTERVAL_CONTINUOUS_COORDINATE_ID]: 'cartesian2D',
    [INTERVAL_CONTINUOUS_MODE_ID]: 'histogram',
    [INTERVAL_HISTOGRAM_COUNT_ID]: 8,
    [INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID]: 0,
    [INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID]: 0,
  },
  relatedApis: [
    'Plot.coordinate',
    'Transform.bin',
    'IntervalMark.x0',
    'IntervalMark.x1',
    'IntervalMark.width',
    'Scale.domainPadding',
  ],
} satisfies PreviewControlContract;
