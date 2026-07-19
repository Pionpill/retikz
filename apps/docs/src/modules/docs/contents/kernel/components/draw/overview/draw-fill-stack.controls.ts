import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Draw 填充与栈序的中文属性面板 */
export const drawFillStackControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw 填充与栈序',
  sections: [
    {
      label: '填充',
      controls: [
        { kind: 'color', id: 'fillA', label: '蓝色图形', defaultValue: '#1e90ff' },
        { kind: 'color', id: 'fillB', label: '红色图形', defaultValue: '#ef4444' },
        {
          kind: 'range',
          id: 'fillOpacity',
          label: '填充透明度',
          defaultValue: 0.7,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: '栈序',
      controls: [
        {
          kind: 'range',
          id: 'zIndexA',
          label: '蓝色 zIndex',
          defaultValue: 0,
          min: -1,
          max: 2,
          step: 1,
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: drawFillStackControls,
  canonicalValues: { fillA: '#1e90ff', fillB: '#ef4444', fillOpacity: 0.7, zIndexA: 0 },
  relatedApis: ['Draw.fill', 'Draw.fillOpacity', 'Draw.zIndex'],
} satisfies PreviewControlContract;
