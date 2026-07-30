import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_POSITION_CONTROL_IDS } from './point-position.controls';

/** 点定位 playground 的英文属性面板 */
export const pointPositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scatter encodings',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'points', label: 'Point rows', rows: points }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
      ],
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
    {
      label: 'Appearance encodings',
      controls: [
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.colorMode,
          label: 'Color encoding',
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'Uniform color' },
            { value: 'region', label: 'By region' },
          ],
        },
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.sizeMode,
          label: 'Size encoding',
          defaultValue: 'fixed',
          options: [
            { value: 'fixed', label: 'Fixed points' },
            { value: 'population', label: 'Population bubbles' },
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
    [POINT_POSITION_CONTROL_IDS.coordinate]: 'cartesian2D',
    [POINT_POSITION_CONTROL_IDS.xField]: 'x',
    [POINT_POSITION_CONTROL_IDS.yField]: 'y',
    [POINT_POSITION_CONTROL_IDS.colorMode]: 'none',
    [POINT_POSITION_CONTROL_IDS.sizeMode]: 'fixed',
  },
  presets: [
    {
      id: 'xy',
      label: 'x / y',
      values: {
        [POINT_POSITION_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_POSITION_CONTROL_IDS.xField]: 'x',
        [POINT_POSITION_CONTROL_IDS.yField]: 'y',
        [POINT_POSITION_CONTROL_IDS.colorMode]: 'none',
        [POINT_POSITION_CONTROL_IDS.sizeMode]: 'fixed',
      },
    },
    {
      id: 'bubble',
      label: 'Regional bubbles',
      values: {
        [POINT_POSITION_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_POSITION_CONTROL_IDS.xField]: 'x',
        [POINT_POSITION_CONTROL_IDS.yField]: 'y',
        [POINT_POSITION_CONTROL_IDS.colorMode]: 'region',
        [POINT_POSITION_CONTROL_IDS.sizeMode]: 'population',
      },
    },
  ],
  relatedApis: ['Plot.coordinate', 'PointMark.x', 'PointMark.y', 'PointMark.color', 'PointMark.size'],
} satisfies PreviewControlContract;
