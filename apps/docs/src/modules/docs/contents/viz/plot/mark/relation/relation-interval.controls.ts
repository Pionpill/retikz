import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformResultView, createPlotTransformTableViews } from '../../transform-table-views';
import { intervalRelations } from './relation-interval.data';

/** 区间关系 playground 的稳定控件 id */
export const RELATION_INTERVAL_CONTROL_IDS = {
  offset: 'relation-interval-offset',
  strokeWidth: 'relation-interval-stroke-width',
  lineStyle: 'relation-interval-line-style',
  labelPosition: 'relation-interval-label-position',
  labelSide: 'relation-interval-label-side',
  labelSloped: 'relation-interval-label-sloped',
  barLabelPosition: 'relation-interval-bar-label-position',
  barLabelColor: 'relation-interval-bar-label-color',
} as const;

/** 根据高度偏移控件创建 Plot 实际消费的区间行 */
export const relationIntervalRowsOf = (values: { [RELATION_INTERVAL_CONTROL_IDS.offset]: number }) =>
  intervalRelations.map(row => ({
    ...row,
    routeY: Number(row.routeY) + values[RELATION_INTERVAL_CONTROL_IDS.offset],
  }));

/** 下降关系层的端点配对 operation */
export const relationDecreaseOperation = {
  kind: 'relate',
  groupBy: ['pair'],
  source: {
    selector: { kind: 'min', by: 'decreaseOrder' },
    fields: { x: 'slot', y: 'value', viaY: 'routeY' },
  },
  target: { selector: { kind: 'max', by: 'decreaseOrder' }, fields: { x: 'slot', y: 'value' } },
  measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
} as const;

/** 上升关系层的端点配对 operation */
export const relationIncreaseOperation = {
  kind: 'relate',
  groupBy: ['pair'],
  source: {
    selector: { kind: 'min', by: 'increaseOrder' },
    fields: { x: 'slot', y: 'value', viaY: 'routeY' },
  },
  target: { selector: { kind: 'max', by: 'increaseOrder' }, fields: { x: 'slot', y: 'value' } },
  measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
} as const;

/** 区间关系路由的中文属性面板 */
export const relationIntervalControls = definePreviewControls({
  presentation: 'panel',
  title: '区间关系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'intervalRelations',
          label: '区间关系',
          views: [
            ...createPlotTransformTableViews(
              { source: '原始', result: '下降关系层' },
              relationIntervalRowsOf,
              () => relationDecreaseOperation,
            ),
            createPlotTransformResultView(
              'increase-result',
              '上升关系层',
              relationIntervalRowsOf,
              () => relationIncreaseOperation,
            ),
          ],
        },
      ],
    },
    {
      label: '关系样式',
      controls: [
        {
          kind: 'range',
          id: RELATION_INTERVAL_CONTROL_IDS.offset,
          label: '高度偏移',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
        {
          kind: 'range',
          id: RELATION_INTERVAL_CONTROL_IDS.strokeWidth,
          label: '线宽',
          defaultValue: 1.1,
          min: 0.5,
          max: 4,
          step: 0.1,
        },
        {
          kind: 'select',
          id: RELATION_INTERVAL_CONTROL_IDS.lineStyle,
          label: '线型',
          defaultValue: 'dashed',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
        },
      ],
    },
    {
      label: '关系标签',
      controls: [
        {
          kind: 'range',
          id: RELATION_INTERVAL_CONTROL_IDS.labelPosition,
          label: '路径位置',
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_INTERVAL_CONTROL_IDS.labelSide,
          label: '相对路径方位',
          defaultValue: 'top',
          options: [
            { value: 'center', label: '居中' },
            { value: 'top', label: '上方（默认）' },
            { value: 'bottom', label: '下方' },
          ],
        },
        {
          kind: 'switch',
          id: RELATION_INTERVAL_CONTROL_IDS.labelSloped,
          label: '沿路径倾斜',
          defaultValue: true,
        },
      ],
    },
    {
      label: '区间标签',
      controls: [
        {
          kind: 'select',
          id: RELATION_INTERVAL_CONTROL_IDS.barLabelPosition,
          label: '标签方位',
          defaultValue: 'top',
          options: [
            { value: 'center', label: '居中' },
            { value: 'top', label: '上方' },
            { value: 'right', label: '右侧' },
            { value: 'bottom', label: '下方' },
            { value: 'left', label: '左侧' },
          ],
        },
        {
          kind: 'text',
          id: RELATION_INTERVAL_CONTROL_IDS.barLabelColor,
          label: '标签颜色',
          defaultValue: 'currentColor',
        },
      ],
    },
  ],
});

/** 区间关系 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: relationIntervalControls,
  canonicalValues: {
    [RELATION_INTERVAL_CONTROL_IDS.offset]: 0,
    [RELATION_INTERVAL_CONTROL_IDS.strokeWidth]: 1.1,
    [RELATION_INTERVAL_CONTROL_IDS.lineStyle]: 'dashed',
    [RELATION_INTERVAL_CONTROL_IDS.labelPosition]: 0.5,
    [RELATION_INTERVAL_CONTROL_IDS.labelSide]: 'top',
    [RELATION_INTERVAL_CONTROL_IDS.labelSloped]: true,
    [RELATION_INTERVAL_CONTROL_IDS.barLabelPosition]: 'top',
    [RELATION_INTERVAL_CONTROL_IDS.barLabelColor]: 'currentColor',
  },
  relatedApis: [
    'RelationMark.transform',
    'RelationMark.style',
    'RelationMark.path',
    'RelationMark.path.label.placement',
    'IntervalMark.labelPosition',
  ],
} satisfies PreviewControlContract;
