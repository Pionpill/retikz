import { defineRelationRoleControlContract } from './relation-role-controls';

/** influence role English controls contract */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation: Influence',
  sectionLabel: 'Semantics and presentation',
  statusLocale: 'en',
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

export const relationInfluenceControls = previewControlContract.controls;
