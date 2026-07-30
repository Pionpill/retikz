import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { interruptedArea } from './line-interruption.data';

/** 缺失值连接 playground 的稳定控件 id */
export const LINE_INTERRUPTION_CONNECT_NULLS_ID = 'line-interruption-connect-nulls';

/** 缺失值 playground 的其它稳定控件 id */
export const LINE_INTERRUPTION_CONTROL_IDS = {
  coordinate: 'path-interruption-coordinate',
  closed: 'path-interruption-closed',
  showFill: 'line-interruption-show-fill',
} as const;

/** 缺失值连接的中文属性面板 */
export const lineInterruptionControls = definePreviewControls({
  presentation: 'panel',
  title: '缺失值处理',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'interruptedArea', label: '缺失值序列', rows: interruptedArea }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: LINE_INTERRUPTION_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_INTERRUPTION_CONTROL_IDS.closed,
          label: '是否闭合',
          defaultValue: false,
          visibleWhen: { controlId: LINE_INTERRUPTION_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: '连接',
      controls: [
        {
          kind: 'switch',
          id: LINE_INTERRUPTION_CONNECT_NULLS_ID,
          label: '跨过空值连接',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: LINE_INTERRUPTION_CONTROL_IDS.showFill,
          label: '显示区域填充',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 缺失值连接 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineInterruptionControls,
  canonicalValues: {
    [LINE_INTERRUPTION_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_INTERRUPTION_CONTROL_IDS.closed]: false,
    [LINE_INTERRUPTION_CONNECT_NULLS_ID]: false,
    [LINE_INTERRUPTION_CONTROL_IDS.showFill]: true,
  },
  relatedApis: [
    'Plot.coordinate',
    'PathMark.closed',
    'PathMark.connectNulls',
    'PathMark.closure',
    'PathMark.fill',
    'PathMark.order',
  ],
} satisfies PreviewControlContract;
