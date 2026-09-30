import type { Lang } from '@/i18n';

/** 不同物理字段经字段契约接入同一 Chart 的示意图文案 */
export const chartDataModelBridgeI18n: Record<
  Lang,
  Readonly<{
    sourceA: string;
    sourceB: string;
    adapterA: string;
    adapterB: string;
    chart: string;
  }>
> = {
  zh: {
    sourceA: '数据源 A · 原始字段',
    sourceB: '数据源 B · 原始字段',
    adapterA: 'A · model + fieldMap',
    adapterB: 'B · model + fieldMap',
    chart: '同一个 Chart · encodings',
  },
  en: {
    sourceA: 'Dataset A · raw fields',
    sourceB: 'Dataset B · raw fields',
    adapterA: 'A · model + fieldMap',
    adapterB: 'B · model + fieldMap',
    chart: 'Same Chart · encodings',
  },
};
