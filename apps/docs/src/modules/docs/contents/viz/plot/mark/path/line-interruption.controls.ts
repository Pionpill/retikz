import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { interruptedArea } from './line-interruption.data';

/** 缺失值连接 playground 的稳定控件 id */
export const LINE_INTERRUPTION_CONNECT_NULLS_ID = 'line-interruption-connect-nulls';

/** 缺失值连接的中文属性面板 */
export const lineInterruptionControls = definePreviewControls({
  presentation: 'panel',
  title: '缺失值处理',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'interruptedArea', label: '缺失值序列', rows: interruptedArea }],
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
      ],
    },
  ],
});

/** 缺失值连接 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineInterruptionControls,
  canonicalValues: { [LINE_INTERRUPTION_CONNECT_NULLS_ID]: false },
  relatedApis: ['PathMark.connectNulls', 'PathMark.order'],
} satisfies PreviewControlContract;
