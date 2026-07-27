import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { samples } from './point-coordinates.data';

/** 一维点定位 playground 的稳定控件 id */
export const POINT_COORDINATE_1D_CONTROL_IDS = {
  xField: 'point-coordinate-x-field',
} as const;

/** 一维点定位 playground 的中文属性面板 */
export const pointCoordinate1dControls = definePreviewControls({
  presentation: 'panel',
  title: '一维位置角色',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'samples', label: '坐标样本', rows: samples }],
    },
    {
      label: '位置通道',
      controls: [
        {
          kind: 'select',
          id: POINT_COORDINATE_1D_CONTROL_IDS.xField,
          label: 'x 字段',
          defaultValue: 'value',
          options: [
            { value: 'value', label: 'value' },
            { value: 'x', label: 'x' },
            { value: 'y', label: 'y' },
          ],
        },
      ],
    },
  ],
});

/** 一维点定位 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: pointCoordinate1dControls,
  canonicalValues: {
    [POINT_COORDINATE_1D_CONTROL_IDS.xField]: 'value',
  },
  relatedApis: ['PointMark.x'],
} satisfies PreviewControlContract;
