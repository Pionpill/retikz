import { defineRelationRoleControlContract } from './relation-role-controls';

/** generalization role 的中文 controls 契约 */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation：泛化',
  sectionLabel: '语义与展示',
  statusLocale: 'zh',
  kind: {
    label: '内置 kind',
    defaultValue: '',
    options: [
      { value: '', label: '默认值' },
      { value: 'uml.generalization', label: 'UML 泛化' },
    ],
  },
  colorLabel: 'Relation 主色',
});

export const relationGeneralizationControls = previewControlContract.controls;
