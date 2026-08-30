import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { connectedScatterData } from './connected-scatter-basic.data';

export const CONNECTED_SCATTER_CONTROL_IDS = {
  connectNulls: 'connected-scatter-connect-nulls',
  lineStyle: 'connected-scatter-line-style',
  strokeWidth: 'connected-scatter-stroke-width',
  pointSize: 'connected-scatter-point-size',
} as const;

export const connectedScatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '轨迹与观测点',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'World Bank 国家轨迹',
          rows: connectedScatterData,
          columns: [
            { key: 'country', label: '国家' },
            { key: 'year', label: '年份' },
            { key: 'urbanization', label: '城镇化率（%）' },
            { key: 'lifeExpectancy', label: '预期寿命（岁）' },
          ],
        },
      ],
    },
    {
      label: '轨迹',
      controls: [
        { kind: 'switch', id: CONNECTED_SCATTER_CONTROL_IDS.connectNulls, label: '跨过缺值连接', defaultValue: false },
        {
          kind: 'select',
          id: CONNECTED_SCATTER_CONTROL_IDS.lineStyle,
          label: '线型',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
          ],
        },
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.strokeWidth,
          label: '线宽',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
      ],
    },
    {
      label: '观测点',
      controls: [
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.pointSize,
          label: '半径',
          defaultValue: 4,
          min: 2,
          max: 10,
          step: 1,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: connectedScatterBasicControls,
  canonicalValues: {
    [CONNECTED_SCATTER_CONTROL_IDS.connectNulls]: false,
    [CONNECTED_SCATTER_CONTROL_IDS.lineStyle]: 'solid',
    [CONNECTED_SCATTER_CONTROL_IDS.strokeWidth]: 2,
    [CONNECTED_SCATTER_CONTROL_IDS.pointSize]: 4,
  },
  relatedApis: [
    'ConnectedScatterProperties.path.connectNulls',
    'ConnectedScatterProperties.path.dashPattern',
    'ConnectedScatterProperties.path.strokeWidth',
    'ConnectedScatterProperties.point.size',
  ],
} satisfies PreviewControlContract;
