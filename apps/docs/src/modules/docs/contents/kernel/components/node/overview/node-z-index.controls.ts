import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** zIndex demo 使用的稳定字段 id */
export const NodeZIndexControlId = {
  A: 'zIndexA',
  B: 'zIndexB',
  C: 'zIndexC',
} as const;

/** 节点栈序的中文属性面板 */
export const nodeZIndexControls = definePreviewControls({
  presentation: 'panel',
  title: '栈序',
  sections: [
    {
      label: 'zIndex',
      controls: [
        {
          kind: 'range',
          id: NodeZIndexControlId.A,
          label: 'a zIndex',
          defaultValue: 2,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: NodeZIndexControlId.B,
          label: 'b zIndex',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: NodeZIndexControlId.C,
          label: 'c zIndex',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
      ],
    },
  ],
});

/** Node 层级面板的稳定文档契约 */
export const previewControlContract = {
  controls: nodeZIndexControls,
  canonicalValues: { zIndexA: 2, zIndexB: 0, zIndexC: 0 },
  relatedApis: ['Node.zIndex'],
} satisfies PreviewControlContract;
