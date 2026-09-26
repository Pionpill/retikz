import type { Lang } from '@/i18n';
/** 服务可用性示例与控件的共用文案 */
export const entityDefinitionI18n: Record<
  Lang,
  { title: string; status: string; critical: string; gateway: string; statuses: Array<string> }
> = {
  zh: {
    title: '服务可用性',
    status: '可用性',
    critical: '关键服务',
    gateway: 'API 网关',
    statuses: ['可用', '降级', '离线'],
  },
  en: {
    title: 'Service availability',
    status: 'Availability',
    critical: 'Critical service',
    gateway: 'API gateway',
    statuses: ['Available', 'Degraded', 'Offline'],
  },
};
