import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { otherRows } from './builtin-other.data';

/** 其他通道示例的中文数据面板 */
export const builtinOtherControls = definePreviewControls({
  presentation: 'panel',
  title: '其他通道',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '系列数据',
          rows: otherRows,
          columns: [
            { key: 'step', label: '步骤' },
            { key: 'value', label: '数值' },
            { key: 'series', label: '系列' },
          ],
        },
      ],
    },
    {
      label: '路径构造',
      controls: [
        { kind: 'switch', id: 'orderEnabled', label: '按 step 排序', defaultValue: true },
        { kind: 'switch', id: 'seriesEnabled', label: '按 series 拆分', defaultValue: true },
      ],
    },
    {
      label: '绘制层级',
      controls: [
        {
          kind: 'range',
          id: 'pointZIndex',
          label: 'B 点 zIndex',
          defaultValue: 2,
          min: -2,
          max: 3,
          step: 1,
        },
      ],
    },
  ],
});

/** 其他通道示例的稳定文档契约 */
export const previewControlContract = {
  controls: builtinOtherControls,
  canonicalValues: {
    orderEnabled: true,
    seriesEnabled: true,
    pointZIndex: 2,
  },
  relatedApis: ['PointMark.zIndex', 'PathMark.order', 'PathMark.series'],
} satisfies PreviewControlContract;
