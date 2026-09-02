import { defineRelationRoleControlContract } from './relation-role-controls';

/** dependency role 的中文 controls 契约 */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation：依赖',
  sectionLabel: '语义与展示',
  kind: {
    label: '内置 kind',
    defaultValue: '',
    options: [
      { value: '', label: '默认值' },
      { value: 'uml.dependency', label: 'UML 依赖' },
      { value: 'uml.realization', label: 'UML 实现' },
    ],
  },
  colorLabel: 'Relation 主色',
});

export const relationDependencyControls = previewControlContract.controls;
