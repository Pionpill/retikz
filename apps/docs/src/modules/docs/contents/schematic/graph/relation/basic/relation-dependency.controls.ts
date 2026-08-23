import { defineRelationRoleControlContract } from './relation-role-controls';

/** dependency role 的中文 controls 契约 */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation：依赖',
  sectionLabel: '语义与展示',
  kind: {
    label: '内置 kind',
    defaultValue: '',
    options: [
      { value: '', label: '基础 dependency' },
      { value: 'provenance.derivation', label: 'Provenance 派生' },
    ],
  },
  colorLabel: 'Relation 主色',
});

export const relationDependencyControls = previewControlContract.controls;
