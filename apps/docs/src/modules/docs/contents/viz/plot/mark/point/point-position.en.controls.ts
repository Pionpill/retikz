import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_POSITION_CONTROL_IDS } from './point-position.controls';

/** 点定位 playground 的英文属性面板 */
export const pointPositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Position fields',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'points', label: 'Point rows', rows: points }],
    },
    {
      label: 'Position channels',
      controls: [
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.xField,
          label: 'x field',
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
          label: 'y field',
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

/** 点定位 playground 的英文稳定文档契约 */
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
