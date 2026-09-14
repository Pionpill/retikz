import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';

import { defineEntityRoleControlContract } from './entity-role-controls';

/** state role 的中文 controls 契约 */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity：状态',
  sectionLabel: '视觉与文本',
  statusLocale: 'zh',
  colorLabel: '实例颜色',
  contentLabel: '文本',
  contentPlaceholder: '输入 Entity 文本',
  content: 'Pending',
  kinds: [LogicFigureEntityKind.ImportantData, LogicFigureEntityKind.Secondary],
});

/** state role 的中文属性面板 */
export const entityStateControls = previewControlContract.controls;
