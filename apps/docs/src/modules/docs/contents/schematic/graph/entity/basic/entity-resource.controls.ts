import { defineEntityRoleControlContract } from './entity-role-controls';

/** resource role 的中文 controls 契约 */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity：资源',
  sectionLabel: '视觉与文本',
  colorLabel: 'Graph Theme 主色',
  contentLabel: '文本',
  contentPlaceholder: '输入 Entity 文本',
  content: 'Order DB',
});

/** resource role 的中文属性面板 */
export const entityResourceControls = previewControlContract.controls;
