import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';

/** 点定位 playground 的稳定控件 id */
export const POINT_POSITION_CONTROL_IDS = {
  coordinate: 'point-position-coordinate',
  xField: 'point-position-x-field',
  yField: 'point-position-y-field',
  colorMode: 'point-position-color-mode',
  sizeMode: 'point-position-size-mode',
} as const;

/** 点定位 playground 的中文属性面板 */
export const pointPositionControls = definePreviewControls({
  presentation: 'panel',
  title: '散点编码',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'points', label: '点数据', rows: points }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
      ],
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
    {
      label: '外观编码',
      controls: [
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.colorMode,
          label: '颜色编码',
          defaultValue: 'none',
          options: [
            { value: 'none', label: '统一颜色' },
            { value: 'region', label: '按地区' },
          ],
        },
        {
          kind: 'select',
          id: POINT_POSITION_CONTROL_IDS.sizeMode,
          label: '尺寸编码',
          defaultValue: 'fixed',
          options: [
            { value: 'fixed', label: '固定散点' },
            { value: 'population', label: '按人口气泡' },
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
      label: '地区气泡',
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
