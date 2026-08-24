import { defineRelationRoleControlContract } from './relation-role-controls';

/** influence role 的中文 controls 契约 */
export const previewControlContract = defineRelationRoleControlContract({
  title: 'Relation：影响',
  sectionLabel: '语义与展示',
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

export const relationInfluenceControls = previewControlContract.controls;
