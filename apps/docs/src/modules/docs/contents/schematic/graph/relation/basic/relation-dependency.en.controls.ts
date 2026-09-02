import { defineRelationRoleControlContract } from './relation-role-controls';

/** dependency role English controls contract */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation: Dependency',
  sectionLabel: 'Semantics and presentation',
  kind: {
    label: 'Built-in kind',
    defaultValue: '',
    options: [
      { value: '', label: 'Default' },
      { value: 'provenance.derivation', label: 'Provenance derivation' },
    ],
  },
  colorLabel: 'Relation color',
});

export const relationDependencyControls = previewControlContract.controls;
