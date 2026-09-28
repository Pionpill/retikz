import type { Lang } from '@/i18n';
/** 关系示例与控制面板文案 */
export const relationFlowI18n: Record<Lang, { controls: Array<string>; source: string; target: string }> = {
  zh: {
    controls: ['Relation：流动', '语义与展示', '语义方向', '双向', 'Relation 主色'],
    source: '发送',
    target: '接收',
  },
  en: {
    controls: ['Relation: Flow', 'Semantics and presentation', 'Semantic direction', 'Both', 'Relation color'],
    source: 'Sender',
    target: 'Receiver',
  },
};
