import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { vehicleScatterData } from './scatter-basic.data';

/** 基础 Scatter playground 的稳定控件 id */
export const SCATTER_BASIC_CONTROL_IDS = {
  pointSize: 'pointSize',
  pointOpacity: 'pointOpacity',
  colorByGroup: 'colorByGroup',
  gridVisible: 'gridVisible',
} as const;

/** 基础 Scatter 的中文控制面板 */
export const scatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '散点图',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '车辆样本',
          rows: vehicleScatterData,
          columns: [
            { key: 'model', label: '车型' },
            { key: 'weight', label: '重量' },
            { key: 'efficiency', label: '效率' },
            { key: 'power', label: '功率' },
            { key: 'group', label: '分组' },
          ],
        },
      ],
    },
    {
      label: '散点',
      controls: [
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointSize,
          label: '大小',
          defaultValue: 10,
          min: 6,
          max: 18,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointOpacity,
          label: '不透明度',
          defaultValue: 0.82,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'switch',
          id: SCATTER_BASIC_CONTROL_IDS.colorByGroup,
          label: '按分组着色',
          defaultValue: true,
        },
      ],
    },
    {
      label: '坐标轴',
      controls: [
        {
          kind: 'switch',
          id: SCATTER_BASIC_CONTROL_IDS.gridVisible,
          label: '显示网格',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 基础 Scatter 的稳定文档契约 */
export const previewControlContract = {
  controls: scatterBasicControls,
  canonicalValues: {
    [SCATTER_BASIC_CONTROL_IDS.pointSize]: 10,
    [SCATTER_BASIC_CONTROL_IDS.pointOpacity]: 0.82,
    [SCATTER_BASIC_CONTROL_IDS.colorByGroup]: true,
    [SCATTER_BASIC_CONTROL_IDS.gridVisible]: true,
  },
  relatedApis: ['PointMark.size', 'PointMark.opacity', 'PointMark.color', 'Axis.grid'],
} satisfies PreviewControlContract;
