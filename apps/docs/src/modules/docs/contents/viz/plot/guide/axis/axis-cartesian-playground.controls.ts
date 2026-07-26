import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { axisCartesianPlaygroundRows } from './axis-cartesian-playground.data';

/** 笛卡尔坐标轴综合示例的中文控件 */
export const axisCartesianPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '笛卡尔坐标轴试验场',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '共享样本',
          rows: axisCartesianPlaygroundRows,
          columns: [
            { key: 'category', label: '分类' },
            { key: 'x', label: 'x' },
            { key: 'y', label: 'y' },
          ],
        },
      ],
    },
    {
      label: '场景',
      controls: [
        {
          kind: 'select',
          id: 'scene',
          label: '轴场景',
          defaultValue: 'continuous-edge',
          options: [
            { value: 'continuous-edge', label: '连续轴 · 边缘' },
            { value: 'continuous-origin', label: '连续轴 · 原点' },
            { value: 'categorical', label: '分类轴 · 标签' },
          ],
        },
      ],
    },
    {
      label: '候选刻度',
      visibleWhen: { controlId: 'scene', oneOf: ['continuous-edge', 'continuous-origin'] },
      controls: [
        {
          kind: 'select',
          id: 'intervalStep',
          label: '固定间隔',
          defaultValue: '10',
          options: [
            { value: '5', label: '5' },
            { value: '10', label: '10' },
            { value: '20', label: '20' },
          ],
        },
        { kind: 'range', id: 'maxCount', label: '最多显示', defaultValue: 7, min: 2, max: 12, step: 1 },
        { kind: 'range', id: 'minGap', label: '最小间距', defaultValue: 32, min: 0, max: 60, step: 4 },
        {
          kind: 'select',
          id: 'markKind',
          label: '标记形状',
          defaultValue: 'line',
          options: [
            { value: 'line', label: '短线' },
            { value: 'circle', label: '圆形' },
            { value: 'triangle', label: '三角形' },
          ],
        },
      ],
    },
    {
      label: '网格',
      visibleWhen: { controlId: 'scene', oneOf: ['continuous-edge', 'continuous-origin'] },
      controls: [
        {
          kind: 'select',
          id: 'gridStep',
          label: '主网格间隔',
          defaultValue: '10',
          options: [
            { value: '5', label: '5' },
            { value: '10', label: '10' },
            { value: '20', label: '20' },
          ],
        },
        { kind: 'range', id: 'gridOpacity', label: '主网格透明度', defaultValue: 0.45, min: 0.15, max: 1, step: 0.05 },
        { kind: 'switch', id: 'showMinor', label: '显示次网格', defaultValue: true },
        {
          kind: 'select',
          id: 'minorStep',
          label: '次网格间隔',
          defaultValue: '2.5',
          visibleWhen: { controlId: 'showMinor', oneOf: [true] },
          options: [
            { value: '1', label: '1' },
            { value: '2.5', label: '2.5' },
          ],
        },
      ],
    },
    {
      label: '分类标签',
      visibleWhen: { controlId: 'scene', oneOf: ['categorical'] },
      controls: [
        {
          kind: 'select',
          id: 'rotation',
          label: '旋转',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '自动' },
            { value: '0', label: '0°' },
            { value: '-45', label: '-45°' },
            { value: '-90', label: '-90°' },
          ],
        },
        {
          kind: 'select',
          id: 'hideStrategy',
          label: '重叠处理',
          defaultValue: 'none',
          options: [
            { value: 'none', label: '全部保留' },
            { value: 'greedy', label: '贪心隐藏' },
            { value: 'parity', label: '奇偶隐藏' },
          ],
        },
        {
          kind: 'select',
          id: 'overflow',
          label: '边界溢出',
          defaultValue: 'flush',
          options: [
            { value: 'allow', label: '允许' },
            { value: 'hide', label: '隐藏' },
            { value: 'flush', label: '回收到轴内' },
          ],
        },
      ],
    },
    {
      label: '原点与端点',
      visibleWhen: { controlId: 'scene', oneOf: ['continuous-origin'] },
      controls: [
        {
          kind: 'select',
          id: 'crossingLabel',
          label: '原点标签',
          defaultValue: 'corner',
          options: [
            { value: 'show', label: '轴旁显示' },
            { value: 'hide', label: '隐藏' },
            { value: 'corner', label: '移到角落' },
          ],
        },
        {
          kind: 'select',
          id: 'corner',
          label: '角落位置',
          defaultValue: 'bottom-left',
          visibleWhen: { controlId: 'crossingLabel', oneOf: ['corner'] },
          options: [
            { value: 'top-left', label: '左上' },
            { value: 'top-right', label: '右上' },
            { value: 'bottom-left', label: '左下' },
            { value: 'bottom-right', label: '右下' },
          ],
        },
        { kind: 'switch', id: 'showArrow', label: '显示正向箭头', defaultValue: true },
        {
          kind: 'range',
          id: 'endpointDistance',
          label: '刻度避让距离',
          defaultValue: 12,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: { controlId: 'showArrow', oneOf: [true] },
        },
      ],
    },
  ],
});

/** 笛卡尔坐标轴综合示例的稳定文档契约 */
export const previewControlContract = {
  controls: axisCartesianPlaygroundControls,
  canonicalValues: {
    scene: 'continuous-edge',
    intervalStep: '10',
    maxCount: 7,
    minGap: 32,
    markKind: 'line',
    gridStep: '10',
    gridOpacity: 0.45,
    showMinor: true,
    minorStep: '2.5',
    rotation: 'auto',
    hideStrategy: 'none',
    overflow: 'flush',
    crossingLabel: 'corner',
    corner: 'bottom-left',
    showArrow: true,
    endpointDistance: 12,
  },
  relatedApis: [
    'Axis.ticks.interval',
    'Axis.ticks.density',
    'Axis.ticks.mark',
    'Axis.grid',
    'Axis.grid.minor',
    'Axis.tickLabels.layout',
    'Axis.placement',
    'Axis.crossing',
    'Axis.line.arrow',
    'Axis.ticks.endpoint',
  ],
} satisfies PreviewControlContract;
