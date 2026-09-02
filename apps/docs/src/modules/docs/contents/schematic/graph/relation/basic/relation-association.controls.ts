import { defineRelationRoleControlContract } from './relation-role-controls';

/** association role 的中文 controls 契约 */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation：关联',
  sectionLabel: '语义与展示',
  kind: {
    label: '内置 kind',
    defaultValue: '',
    options: [
      { value: '', label: '默认值' },
      { value: 'uml.association', label: 'UML 一般关联' },
      { value: 'uml.aggregation', label: 'UML 聚合' },
      { value: 'uml.composition', label: 'UML 组合' },
    ],
  },
  direction: {
    label: '语义方向',
    defaultValue: 'forward',
    visibleWithKinds: [''],
    options: [
      { value: 'none', label: '无方向' },
      { value: 'forward', label: 'source → target' },
      { value: 'reverse', label: 'target → source' },
      { value: 'both', label: '双向' },
    ],
  },
  colorLabel: 'Relation 主色',
});

export const relationAssociationControls = previewControlContract.controls;
