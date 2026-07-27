import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { temperature } from './coordinate-switch.data';

/** 二维坐标系切换示例的中文控件 */
export const coordinateSwitchControls = definePreviewControls({
  presentation: 'panel',
  title: '二维坐标系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '月度温度',
          rows: temperature,
          columns: [
            { key: 'month', label: '月份' },
            { key: 'value', label: '温度' },
          ],
        },
      ],
    },
    {
      label: '坐标形态',
      controls: [
        {
          kind: 'select',
          id: 'coordinate',
          label: '投影形态',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '直角坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
        {
          kind: 'range',
          id: 'innerRadius',
          label: '内半径',
          defaultValue: 0,
          min: 0,
          max: 0.75,
          step: 0.05,
          visibleWhen: { controlId: 'coordinate', oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: '绘图区',
      controls: [
        {
          kind: 'range',
          id: 'marginTop',
          label: '上留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginRight',
          label: '右留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginBottom',
          label: '下留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginLeft',
          label: '左留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
      ],
    },
  ],
});

/** 二维坐标系切换示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateSwitchControls,
  canonicalValues: {
    coordinate: 'cartesian2D',
    innerRadius: 0,
    marginTop: 24,
    marginRight: 24,
    marginBottom: 24,
    marginLeft: 24,
  },
  presets: [
    {
      id: 'cartesian',
      label: '直角坐标',
      values: {
        coordinate: 'cartesian2D',
        innerRadius: 0,
        marginTop: 24,
        marginRight: 24,
        marginBottom: 24,
        marginLeft: 24,
      },
    },
    {
      id: 'polar',
      label: '极坐标',
      values: {
        coordinate: 'polar2D',
        innerRadius: 0,
        marginTop: 24,
        marginRight: 24,
        marginBottom: 24,
        marginLeft: 24,
      },
    },
  ],
  relatedApis: ['Plot.coordinate', 'Plot.margin'],
} satisfies PreviewControlContract;
