import { defineRelationRoleControlContract } from './relation-role-controls';

/** generalization role English controls contract */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation: Generalization',
  sectionLabel: 'Semantics and presentation',
  kind: {
    label: 'Built-in kind',
    defaultValue: '',
    options: [
      { value: '', label: 'Default' },
      { value: 'uml.generalization', label: 'UML generalization' },
    ],
  },
  colorLabel: 'Relation color',
});

export const relationGeneralizationControls = previewControlContract.controls;
