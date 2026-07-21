import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ScopeLocalNamespaceBasicControlId } from './scope-local-namespace-basic.controls';

/** Scope local-namespace controls in English */
export const scopeLocalNamespaceBasicEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope namespace',
  sections: [
    {
      label: 'Inner node',
      controls: [
        {
          kind: 'select',
          id: ScopeLocalNamespaceBasicControlId.NodeId,
          label: 'Node id',
          defaultValue: 'A',
          options: [
            { value: 'A', label: 'A (same as outer)' },
            { value: 'B', label: 'B (different id)' },
            { value: 'local-node', label: 'local-node (local only)' },
          ],
        },
        {
          kind: 'switch',
          id: ScopeLocalNamespaceBasicControlId.LocalNamespace,
          label: 'Local namespace',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Scope local-namespace controls */
export const previewControlContract = {
  controls: scopeLocalNamespaceBasicEnControls,
  canonicalValues: { nodeId: 'A', localNamespace: true },
  relatedApis: ['Scope.localNamespace', 'Node.id'],
} satisfies PreviewControlContract;
