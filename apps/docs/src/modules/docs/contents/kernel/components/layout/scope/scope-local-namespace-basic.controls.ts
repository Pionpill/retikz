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
          kind: 'text',
          id: ScopeLocalNamespaceBasicControlId.NodeId,
          label: 'Node id',
          defaultValue: 'A',
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
