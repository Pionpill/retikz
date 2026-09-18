import type { Lang } from '@/i18n';

export const drawGeometryStatesI18n: Record<
  Lang,
  { raw: string; arrow: string; label: string; place: string; cut: string }
> = {
  zh: { raw: '逻辑路径', arrow: '放置箭头', label: '标签下留断口', place: '放置', cut: '留白' },
  en: { raw: 'Logical path', arrow: 'Arrow placement', label: 'Gap under the label', place: 'Place', cut: 'Cut gap' },
};
