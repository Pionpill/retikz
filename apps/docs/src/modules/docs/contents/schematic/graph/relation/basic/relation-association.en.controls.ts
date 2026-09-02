import { defineRelationRoleControlContract } from './relation-role-controls';

/** association role English controls contract */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation: Association',
  sectionLabel: 'Semantics and presentation',
  statusLocale: 'en',
  kind: {
    label: 'Built-in kind',
    defaultValue: '',
    options: [
      { value: '', label: 'Default' },
      { value: 'uml.association', label: 'UML association' },
      { value: 'uml.aggregation', label: 'UML aggregation' },
      { value: 'uml.composition', label: 'UML composition' },
    ],
  },
  direction: {
    label: 'Semantic direction',
    defaultValue: 'forward',
    visibleWithKinds: [''],
    options: [
      { value: 'none', label: 'None' },
      { value: 'forward', label: 'source → target' },
      { value: 'reverse', label: 'target → source' },
      { value: 'both', label: 'Both' },
    ],
  },
  colorLabel: 'Relation color',
});

export const relationAssociationControls = previewControlContract.controls;
