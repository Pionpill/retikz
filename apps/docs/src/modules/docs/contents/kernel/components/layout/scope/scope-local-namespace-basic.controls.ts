import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Scope 局部命名空间 playground 使用的稳定字段 id */
export const ScopeLocalNamespaceBasicControlId = {
  NodeId: 'nodeId',
  LocalNamespace: 'localNamespace',
} as const;

/** Scope 局部命名空间的中文属性面板 */
export const scopeLocalNamespaceBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope namespace',
  sections: [
    {
      label: '内部节点',
      controls: [
        {
          kind: 'select',
          id: ScopeLocalNamespaceBasicControlId.NodeId,
          label: 'Node id',
          defaultValue: 'A',
          options: [
            { value: 'A', label: 'A（与外层同名）' },
            { value: 'B', label: 'B（不同 id）' },
            { value: 'local-node', label: 'local-node（局部专用）' },
          ],
        },
        {
          kind: 'switch',
          id: ScopeLocalNamespaceBasicControlId.LocalNamespace,
          label: '局部命名空间',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Scope 局部命名空间面板的稳定文档契约 */
export const previewControlContract = {
  controls: scopeLocalNamespaceBasicControls,
  canonicalValues: { nodeId: 'A', localNamespace: true },
  relatedApis: ['Scope.localNamespace', 'Node.id'],
} satisfies PreviewControlContract;
