import type { Lang } from '@/i18n';
/** 功能面板的双语文案 */
export const demoI18n = {
  zh: { title: '槽位与视觉溢出', overflow: '溢出策略', overflow0: '可见', overflow1: '裁切', offset: '浮层水平偏移' },
  en: {
    title: 'Slots and visual overflow',
    overflow: 'Overflow policy',
    overflow0: 'Visible',
    overflow1: 'Clip',
    offset: 'Overlay horizontal offset',
  },
} satisfies Record<Lang, Record<string, string>>;
