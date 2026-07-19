import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

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
