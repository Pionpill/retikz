import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { vehicleBubbleData } from './bubble-basic.data';

/** Bubble playground 的稳定控件 id */
export const BUBBLE_BASIC_CONTROL_IDS = {
  sizeEncoding: 'sizeEncoding',
  colorByGroup: 'colorByGroup',
} as const;

/** Bubble 的中文控制面板 */
export const bubbleBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '气泡图',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '车辆样本',
          rows: vehicleBubbleData,
          columns: [
            { key: 'model', label: '车型' },
            { key: 'weight', label: '重量' },
            { key: 'efficiency', label: '效率' },
            { key: 'power', label: '功率' },
            { key: 'price', label: '价格' },
            { key: 'group', label: '分组' },
          ],
        },
      ],
    },
    {
      label: '气泡编码',
      controls: [
        {
          kind: 'select',
          id: BUBBLE_BASIC_CONTROL_IDS.sizeEncoding,
          label: '面积字段',
          defaultValue: 'power',
          options: [
            { value: 'power', label: '功率' },
            { value: 'price', label: '价格' },
          ],
        },
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.colorByGroup,
          label: '按分组着色',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Bubble 的稳定文档契约 */
export const previewControlContract = {
  controls: bubbleBasicControls,
  canonicalValues: {
    [BUBBLE_BASIC_CONTROL_IDS.sizeEncoding]: 'power',
    [BUBBLE_BASIC_CONTROL_IDS.colorByGroup]: true,
  },
  relatedApis: ['PointMark.size', 'PointMark.color'],
} satisfies PreviewControlContract;
