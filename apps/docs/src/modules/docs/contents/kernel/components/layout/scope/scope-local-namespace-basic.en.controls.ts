import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

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
          kind: 'text',
          id: ScopeLocalNamespaceBasicControlId.NodeId,
          label: 'Node id',
          defaultValue: 'A',
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
