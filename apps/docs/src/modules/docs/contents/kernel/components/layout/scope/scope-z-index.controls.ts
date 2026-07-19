import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Scope zIndex playground 使用的稳定字段 id */
export const ScopeZIndexControlId = {
  ScopeA: 'scopeA',
  NodeA1: 'nodeA1',
  NodeA2: 'nodeA2',
  ScopeB: 'scopeB',
  NodeB1: 'nodeB1',
  NodeB2: 'nodeB2',
} as const;

/** Scope 栈序的中文属性面板 */
export const scopeZIndexControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope zIndex',
  sections: [
    {
      label: 'A 组',
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
      label: 'B 组',
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
