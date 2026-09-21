import type { Lang } from '@/i18n';

export const layoutDisplayComparisonI18n = {
  zh: {
    original: '不传宽高：200 × 100',
    enlarged: '只传 width={400}：400 × 200',
    coordinate: 'A 的绘图坐标始终是 (50, 50)',
    reference: '灰框：宿主范围；两图按同一比例绘制',
  },
  en: {
    original: 'No dimensions: 200 × 100',
    enlarged: 'Only width={400}: 400 × 200',
    coordinate: 'A stays at drawing coordinates (50, 50)',
    reference: 'Gray: host bounds; both use the same scale',
  },
} satisfies Record<Lang, Record<string, string>>;
