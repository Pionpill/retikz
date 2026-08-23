import { defineRelationRoleControlContract } from './relation-role-controls';

/** flow role English controls contract */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation: Flow',
  sectionLabel: 'Semantics and presentation',
  direction: {
    label: 'Semantic direction',
    defaultValue: 'forward',
    options: [
      { value: 'forward', label: 'source → target' },
      { value: 'reverse', label: 'target → source' },
      { value: 'both', label: 'Both' },
    ],
  },
  colorLabel: 'Relation color',
});

export const relationFlowControls = previewControlContract.controls;
