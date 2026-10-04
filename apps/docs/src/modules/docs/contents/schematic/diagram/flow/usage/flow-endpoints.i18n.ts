import type { Lang } from '@/i18n';

/** 单侧自动分离示例文案 */
export const flowEndpointsI18n: Record<
  Lang,
  { title: string; first: string; second: string; third: string; result: string }
> = {
  zh: { title: '显示左侧节点', first: '校验数据', second: '验证权限', third: '检查库存', result: '汇总结果' },
  en: {
    title: 'Show source nodes',
    first: 'Validate data',
    second: 'Check access',
    third: 'Check stock',
    result: 'Collect results',
  },
};
