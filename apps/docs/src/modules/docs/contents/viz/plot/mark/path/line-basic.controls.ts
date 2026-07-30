import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { revenue } from './line-basic.data';

/** 基础路径字段 playground 的稳定控件 id */
export const LINE_BASIC_CONTROL_IDS = {
  coordinate: 'path-basic-coordinate',
  closed: 'path-basic-closed',
  xField: 'line-basic-x-field',
  yField: 'line-basic-y-field',
  orderSource: 'line-basic-order-source',
} as const;

/** 基础路径字段的中文属性面板 */
export const lineBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '位置字段',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'revenue', label: '月度收入', rows: revenue }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_BASIC_CONTROL_IDS.closed,
          label: '是否闭合',
          defaultValue: false,
          visibleWhen: { controlId: LINE_BASIC_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: '位置通道',
      controls: [
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.xField,
          label: 'x 字段',
          defaultValue: 'coordinate',
          options: [
            { value: 'coordinate', label: '按坐标系' },
            { value: 'month', label: 'month' },
            { value: 'period', label: 'period' },
          ],
        },
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.yField,
          label: 'y 字段',
          defaultValue: 'revenue',
          options: [
            { value: 'revenue', label: 'revenue' },
            { value: 'month', label: 'month' },
          ],
        },
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.orderSource,
          label: '连接顺序',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '按 month 排序' },
            { value: 'data', label: '按数据数组顺序' },
          ],
        },
      ],
    },
  ],
});

/** 基础路径字段 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineBasicControls,
  canonicalValues: {
    [LINE_BASIC_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_BASIC_CONTROL_IDS.closed]: false,
    [LINE_BASIC_CONTROL_IDS.xField]: 'coordinate',
    [LINE_BASIC_CONTROL_IDS.yField]: 'revenue',
    [LINE_BASIC_CONTROL_IDS.orderSource]: 'field',
  },
  relatedApis: ['Plot.coordinate', 'PathMark.closed', 'PathMark.x', 'PathMark.y', 'PathMark.order'],
} satisfies PreviewControlContract;
