import type { Lang } from '@/i18n';

/** Source 包含字段与内部树的双语说明 */
export const flowSourceTreeI18n: Record<
  Lang,
  {
    source: string;
    tree: string;
    resolve: string;
    render: string;
    output: string;
    receive: string;
    verify: string;
  }
> = {
  zh: {
    source: 'Source',
    tree: 'CanonicalFlowDiagram',
    resolve: '按 children 查找并校验',
    render: '测量、布局与物化\nScene → renderer',
    output: '同一组元素的最终图形',
    receive: '接收',
    verify: '校验',
  },
  en: {
    source: 'Source',
    tree: 'CanonicalFlowDiagram',
    resolve: 'Look up and validate children',
    render: 'Measure, lay out, materialize\nScene → renderer',
    output: 'Final drawing of the same elements',
    receive: 'Receive',
    verify: 'Verify',
  },
};
