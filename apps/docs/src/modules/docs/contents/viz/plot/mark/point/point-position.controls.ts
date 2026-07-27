import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';

/** 点定位 playground 的稳定控件 id */
export const POINT_POSITION_CONTROL_IDS = {
  xField: 'point-position-x-field',
  yField: 'point-position-y-field',
} as const;

/** 点定位 playground 的中文属性面板 */
export const pointPositionControls = definePreviewControls({
  presentation: 'panel',
  title: '位置字段',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'points', label: '点数据', rows: points }],
    },
    {
      label: '位置通道',
      controls: [
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.xField,
          label: 'x 字段',
          defaultValue: 'x',
          options: [
            { value: 'x', label: 'x' },
            { value: 'y', label: 'y' },
            { value: 'pop', label: 'pop' },
          ],
        },
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.yField,
          label: 'y 字段',
          defaultValue: 'y',
          options: [
            { value: 'y', label: 'y' },
            { value: 'x', label: 'x' },
            { value: 'pop', label: 'pop' },
          ],
        },
      ],
    },
  ],
});

/** 点定位 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: pointPositionControls,
  canonicalValues: {
    [POINT_POSITION_CONTROL_IDS.xField]: 'x',
    [POINT_POSITION_CONTROL_IDS.yField]: 'y',
  },
  presets: [
    {
      id: 'xy',
      label: 'x / y',
      values: {
        [POINT_POSITION_CONTROL_IDS.xField]: 'x',
        [POINT_POSITION_CONTROL_IDS.yField]: 'y',
      },
    },
    {
      id: 'population',
      label: 'x / pop',
      values: {
        [POINT_POSITION_CONTROL_IDS.xField]: 'x',
        [POINT_POSITION_CONTROL_IDS.yField]: 'pop',
      },
    },
  ],
  relatedApis: ['PointMark.x', 'PointMark.y'],
} satisfies PreviewControlContract;
