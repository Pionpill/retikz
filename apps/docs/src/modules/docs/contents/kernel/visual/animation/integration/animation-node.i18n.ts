import type { Lang } from '@/i18n';
/** 节点入场与强调示例文案 */
export const animationNodeI18n: Record<Lang, { entrance: string; emphasis: string; node: string; label: string }> = {
  zh: { entrance: '淡入与滑入', emphasis: '缩放强调', node: '节点', label: '附属标签' },
  en: { entrance: 'Fade and slide in', emphasis: 'Scale emphasis', node: 'Node', label: 'Attached label' },
};
