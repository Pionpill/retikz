import type { Lang } from '@/i18n';

/** Presentation 编写态与解析结果示意图的双语文案 */
export const chartPresentationResolutionI18n: Record<
  Lang,
  Readonly<{
    source: string;
    resolved: string;
    title: string;
    subtitle: string;
    note: string;
    dataSource: string;
  }>
> = {
  zh: {
    source: 'Chart Source.presentation（摘录）',
    resolved: 'Surface.child：Flex',
    title: '五个观测值',
    subtitle: '统一单位',
    note: '仅作布局示意',
    dataSource: '示例数据集',
  },
  en: {
    source: 'Chart Source.presentation (excerpt)',
    resolved: 'Surface.child: Flex',
    title: 'Five observations',
    subtitle: 'Shared unit',
    note: 'Layout illustration',
    dataSource: 'Sample dataset',
  },
};
