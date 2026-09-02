import { defineRelationRoleControlContract } from './relation-role-controls';

/** flow role 的中文 controls 契约 */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation：流动',
  sectionLabel: '语义与展示',
  statusLocale: 'zh',
  direction: {
    label: '语义方向',
    defaultValue: 'forward',
    options: [
      { value: 'forward', label: 'source → target' },
      { value: 'reverse', label: 'target → source' },
      { value: 'both', label: '双向' },
    ],
  },
  colorLabel: 'Relation 主色',
});

export const relationFlowControls = previewControlContract.controls;
