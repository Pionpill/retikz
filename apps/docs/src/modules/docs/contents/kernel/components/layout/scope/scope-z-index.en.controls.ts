import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ScopeZIndexControlId } from './scope-z-index.controls';

/** Scope stacking controls in English */
export const scopeZIndexEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope zIndex',
  sections: [
    {
      label: 'Group A',
      controls: [
        {
          kind: 'range',
          id: ScopeZIndexControlId.ScopeA,
          label: 'Scope A',
          defaultValue: 1,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: ScopeZIndexControlId.NodeA1,
          label: 'Node A1',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: ScopeZIndexControlId.NodeA2,
          label: 'Node A2',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
      ],
    },
    {
      label: 'Group B',
      controls: [
        {
          kind: 'range',
          id: ScopeZIndexControlId.ScopeB,
          label: 'Scope B',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: ScopeZIndexControlId.NodeB1,
          label: 'Node B1',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: ScopeZIndexControlId.NodeB2,
          label: 'Node B2',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Scope z-index controls */
export const previewControlContract = {
  controls: scopeZIndexEnControls,
  canonicalValues: { scopeA: 1, nodeA1: 0, nodeA2: 0, scopeB: 0, nodeB1: 0, nodeB2: 0 },
  relatedApis: ['Scope.zIndex', 'Node.zIndex'],
} satisfies PreviewControlContract;
