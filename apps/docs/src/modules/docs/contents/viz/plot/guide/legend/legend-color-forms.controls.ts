import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './legend.data';

/** 颜色图例形态示例的中文控件 */
export const legendColorFormsControls = definePreviewControls({
  presentation: 'panel',
  title: '颜色图例形态',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '城市样本',
          rows: cities,
          columns: [
            { key: 'lng', label: '横坐标' },
            { key: 'lat', label: '纵坐标' },
            { key: 'region', label: '区域' },
            { key: 'pop', label: '人口' },
          ],
        },
      ],
    },
    {
      label: '形态',
      controls: [
        {
          kind: 'select',
          id: 'form',
          label: '图例形态',
          defaultValue: 'swatch',
          options: [
            { value: 'swatch', label: '分类色块' },
            { value: 'ramp', label: '连续色带' },
            { value: 'binned', label: '分箱色阶' },
          ],
        },
        {
          kind: 'select',
          id: 'position',
          label: '位置',
          defaultValue: 'right',
          options: [
            { value: 'right', label: '右侧' },
            { value: 'left', label: '左侧' },
            { value: 'top', label: '顶部' },
            { value: 'bottom', label: '底部' },
          ],
        },
        { kind: 'switch', id: 'showLabels', label: '显示标签', defaultValue: true },
      ],
    },
    {
      label: '当前形态',
      controls: [
        {
          kind: 'select',
          id: 'orient',
          label: '排列方向',
          defaultValue: 'auto',
          visibleWhen: { controlId: 'form', oneOf: ['swatch'] },
          options: [
            { value: 'auto', label: '跟随位置' },
            { value: 'vertical', label: '纵向' },
            { value: 'horizontal', label: '横向' },
          ],
        },
        {
          kind: 'range',
          id: 'swatchSize',
          label: '色块大小',
          defaultValue: 14,
          min: 8,
          max: 28,
          step: 2,
          visibleWhen: { controlId: 'form', oneOf: ['swatch'] },
        },
        {
          kind: 'range',
          id: 'tickCount',
          label: '目标刻度数',
          defaultValue: 4,
          min: 2,
          max: 8,
          step: 1,
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
        },
        {
          kind: 'select',
          id: 'format',
          label: '数字格式',
          defaultValue: '~s',
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
          options: [
            { value: '~s', label: '紧凑单位' },
            { value: '.0f', label: '整数' },
            { value: '.1f', label: '一位小数' },
          ],
        },
        {
          kind: 'range',
          id: 'rampLength',
          label: '色带长度',
          defaultValue: 118,
          min: 72,
          max: 180,
          step: 6,
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
        },
        {
          kind: 'range',
          id: 'rampThickness',
          label: '色带厚度',
          defaultValue: 14,
          min: 8,
          max: 28,
          step: 2,
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
        },
        {
          kind: 'range',
          id: 'binCount',
          label: '区间数量',
          defaultValue: 4,
          min: 2,
          max: 7,
          step: 1,
          visibleWhen: { controlId: 'form', oneOf: ['binned'] },
        },
        {
          kind: 'select',
          id: 'scheme',
          label: '色板',
          defaultValue: 'blues',
          visibleWhen: { controlId: 'form', oneOf: ['binned'] },
          options: [
            { value: 'blues', label: '蓝色' },
            { value: 'greens', label: '绿色' },
            { value: 'magma', label: '熔岩色' },
          ],
        },
      ],
    },
  ],
});

/** 颜色图例形态示例的稳定文档契约 */
export const previewControlContract = {
  controls: legendColorFormsControls,
  canonicalValues: {
    form: 'swatch',
    position: 'right',
    showLabels: true,
    orient: 'auto',
    swatchSize: 14,
    tickCount: 4,
    format: '~s',
    rampLength: 118,
    rampThickness: 14,
    binCount: 4,
    scheme: 'blues',
  },
  relatedApis: [
    'IRPlotScale.type',
    'PlotLegend.position',
    'PlotLegend.orient',
    'PlotLegend.ticks',
    'PlotLegend.tickLabels',
    'PlotLegend.style.swatchSize',
    'PlotLegend.style.rampLength',
    'PlotLegend.style.rampThickness',
  ],
} satisfies PreviewControlContract;
