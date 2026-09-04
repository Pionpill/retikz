import { defineEntityRoleControlContract } from './entity-role-controls';

/** concept role 的中文 controls 契约 */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity：概念',
  sectionLabel: '视觉与文本',
  statusLocale: 'zh',
  colorLabel: 'Graph Theme 主色',
  contentLabel: '文本',
  contentPlaceholder: '输入 Entity 文本',
  content: 'Order',
});

/** concept role 的中文属性面板 */
export const entityConceptControls = previewControlContract.controls;
