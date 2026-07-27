import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { POINT_COORDINATE_1D_CONTROL_IDS } from './point-coordinate-1d.controls';
import { samples } from './point-coordinates.data';

/** 一维点定位 playground 的英文属性面板 */
export const pointCoordinate1dControls = definePreviewControls({
  presentation: 'panel',
  title: '1D position role',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'samples', label: 'Coordinate samples', rows: samples }],
    },
    {
      label: 'Position channel',
      controls: [
        {
          kind: 'select',
          id: POINT_COORDINATE_1D_CONTROL_IDS.xField,
          label: 'x field',
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

/** 一维点定位 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: pointCoordinate1dControls,
  canonicalValues: {
    [POINT_COORDINATE_1D_CONTROL_IDS.xField]: 'value',
  },
  relatedApis: ['PointMark.x'],
} satisfies PreviewControlContract;
