import type { Lang } from '@/i18n';
/** 实体试验场与控件共用文案 */
export const entityPlaygroundI18n: Record<
  Lang,
  {
    title: string;
    role: string;
    status: string;
    group: string;
    override: string;
    color: string;
    defaultText: string;
    roles: Array<string>;
    statuses: Array<string>;
  }
> = {
  zh: {
    title: '实体外观',
    role: '角色',
    status: '状态',
    group: '应用分组',
    override: '覆盖主题主色',
    color: '主色',
    defaultText: '订单',
    roles: ['参与主体', '工作与动作', '发生点', '持续条件', '控制点', '资源', '抽象概念'],
    statuses: ['无状态', '错误', '成功', '警告', '禁用'],
  },
  en: {
    title: 'Entity appearance',
    role: 'Role',
    status: 'Status',
    group: 'Apply group',
    override: 'Override theme color',
    color: 'Color',
    defaultText: 'Order',
    roles: ['Participant', 'Activity', 'Event', 'State', 'Gateway', 'Resource', 'Concept'],
    statuses: ['No status', 'Error', 'Success', 'Warning', 'Disabled'],
  },
};
