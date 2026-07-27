import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { accountRows } from './coordinate-composition-facet.data';

/** 基础分面 demo 的稳定控件 id */
export const COORDINATE_COMPOSITION_FACET_CONTROL_IDS = {
  layout: 'layout',
  scale: 'scale',
  empty: 'empty',
  headers: 'headers',
  panelGap: 'panelGap',
  xGridVisible: 'xGridVisible',
  yGridVisible: 'yGridVisible',
  lineWidth: 'lineWidth',
  pointSize: 'pointSize',
} as const;

/** 分面试验场的中文控件 */
export const coordinateCompositionFacetControls = definePreviewControls({
  presentation: 'panel',
  title: '分面布局',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '产品账户数',
          rows: accountRows,
          columns: [
            { key: 'product', label: '产品' },
            { key: 'tier', label: '套餐' },
            { key: 'month', label: '月份' },
            { key: 'accounts', label: '账户数' },
          ],
        },
      ],
    },
    {
      label: '布局',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout,
          label: '排列方式',
          defaultValue: 'columns',
          options: [
            { value: 'columns', label: '按列排列' },
            { value: 'grid', label: '行列网格' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.scale,
          label: '纵轴范围',
          defaultValue: 'shared',
          options: [
            { value: 'shared', label: '统一范围' },
            { value: 'independent', label: '各面板独立' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.empty,
          label: '空组合',
          defaultValue: 'drop',
          visibleWhen: { controlId: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout, oneOf: ['grid'] },
          options: [
            { value: 'drop', label: '隐藏' },
            { value: 'show', label: '保留' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.headers,
          label: '显示分面标题',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.panelGap,
          label: '面板间距',
          defaultValue: 18,
          min: 0,
          max: 32,
          step: 2,
        },
      ],
    },
    {
      label: '坐标轴',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.xGridVisible,
          label: '纵向网格（x 轴）',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.yGridVisible,
          label: '横向网格（y 轴）',
          defaultValue: true,
        },
      ],
    },
    {
      label: '图层样式',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.lineWidth,
          label: '折线宽度',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.pointSize,
          label: '数据点尺寸',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
      ],
    },
  ],
});

/** 分面试验场的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateCompositionFacetControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout]: 'columns',
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.scale]: 'shared',
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.empty]: 'drop',
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.headers]: true,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.panelGap]: 18,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.pointSize]: 6,
  },
  presets: [
    {
      id: 'columns',
      label: '单行分面',
      values: {
        layout: 'columns',
        scale: 'shared',
        empty: 'drop',
        headers: true,
        panelGap: 18,
        xGridVisible: true,
        yGridVisible: true,
        lineWidth: 2,
        pointSize: 6,
      },
    },
    {
      id: 'grid-shared',
      label: '共享范围网格',
      values: {
        layout: 'grid',
        scale: 'shared',
        empty: 'show',
        headers: true,
        panelGap: 18,
        xGridVisible: true,
        yGridVisible: true,
        lineWidth: 2,
        pointSize: 6,
      },
    },
    {
      id: 'grid-independent',
      label: '独立范围网格',
      values: {
        layout: 'grid',
        scale: 'independent',
        empty: 'show',
        headers: true,
        panelGap: 18,
        xGridVisible: true,
        yGridVisible: true,
        lineWidth: 2,
        pointSize: 6,
      },
    },
  ],
  relatedApis: [
    'Facet',
    'Facet.resolve',
    'Facet.empty',
    'Facet.spacing',
    'Axis.grid',
    'PathMark.strokeWidth',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;
