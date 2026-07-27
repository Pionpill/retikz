import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { channelRows } from './coordinate-composition-facet-multilevel.data';

/** 多级分面 demo 的稳定控件 id */
export const COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS = {
  rowHierarchy: 'rowHierarchy',
  columnHierarchy: 'columnHierarchy',
  rowHeaders: 'rowHeaders',
  columnHeaders: 'columnHeaders',
  scale: 'scale',
  panelGap: 'panelGap',
  xGridVisible: 'xGridVisible',
  yGridVisible: 'yGridVisible',
  lineWidth: 'lineWidth',
  pointSize: 'pointSize',
} as const;

/** 多级分面示例的中文控件 */
export const coordinateCompositionFacetMultilevelControls = definePreviewControls({
  presentation: 'panel',
  title: '多级分面',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '渠道指标',
          rows: channelRows,
          columns: [
            { key: 'business', label: '业务' },
            { key: 'metric', label: '指标' },
            { key: 'region', label: '地区' },
            { key: 'channel', label: '渠道' },
            { key: 'month', label: '月份' },
            { key: 'value', label: '数值' },
          ],
        },
      ],
    },
    {
      label: '层级',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHierarchy,
          label: '行层级顺序',
          defaultValue: 'business-metric',
          options: [
            { value: 'business-metric', label: '业务 → 指标' },
            { value: 'metric-business', label: '指标 → 业务' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHierarchy,
          label: '列层级顺序',
          defaultValue: 'region-channel',
          options: [
            { value: 'region-channel', label: '地区 → 渠道' },
            { value: 'channel-region', label: '渠道 → 地区' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHeaders,
          label: '显示行标题',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHeaders,
          label: '显示列标题',
          defaultValue: true,
        },
      ],
    },
    {
      label: '布局',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.scale,
          label: '纵轴范围',
          defaultValue: 'shared',
          options: [
            { value: 'shared', label: '统一范围' },
            { value: 'independent', label: '各面板独立' },
          ],
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.panelGap,
          label: '面板间距',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.xGridVisible,
          label: '纵向网格（x 轴）',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.yGridVisible,
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
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.lineWidth,
          label: '折线宽度',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.pointSize,
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

/** 多级分面示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateCompositionFacetMultilevelControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHierarchy]: 'business-metric',
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHierarchy]: 'region-channel',
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHeaders]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHeaders]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.scale]: 'shared',
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.panelGap]: 8,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.pointSize]: 6,
  },
  relatedApis: [
    'Facet.row',
    'Facet.column',
    'Facet.header',
    'Facet.resolve',
    'Facet.spacing',
    'Axis.grid',
    'PathMark.strokeWidth',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;
