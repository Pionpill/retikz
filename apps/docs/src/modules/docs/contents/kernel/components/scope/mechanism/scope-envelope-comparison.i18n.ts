import type { Lang } from '@/i18n';

export const scopeEnvelopeComparisonI18n: Record<
  Lang,
  {
    before: string;
    after: string;
    operation: string;
    intrinsic: string;
    transformed: string;
    legend: string;
  }
> = {
  zh: {
    before: '变换前的边框',
    after: '变换后的边框',
    operation: '×1.4 → 旋转 30°',
    intrinsic: '从这里选旋转中心（pivot）',
    transformed: '从这里选对齐点（selfAnchor）',
    legend: '橙色实线：当前边框；灰色虚线：变换前边界',
  },
  en: {
    before: 'Box before transforms',
    after: 'Box after transforms',
    operation: '×1.4 → rotate 30°',
    intrinsic: 'Choose the pivot here',
    transformed: 'Choose the alignment point here',
    legend: 'Orange solid: current box; gray dashed: original bounds',
  },
};
