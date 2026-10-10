import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { SelectorComparison } from './components';
import type { SelectorRankedValues } from './selector-ranked.data';
import { selectorRankedRowsOf, selectorRankedResultOf } from './selector-ranked.data';

/** 最高与最低 N 行示例的语言输入 */
export type SelectorRankedPreviewProps = SelectorRankedValues & { lang?: Lang };
/** 并排展示原始订单与实际选择结果 */
export const SelectorRankedPreview: FC<SelectorRankedPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <SelectorComparison
      rows={selectorRankedRowsOf(values)}
      result={selectorRankedResultOf(values)}
      operation={values.method === 'bottom' ? 'bottom' : 'top'}
      grouped={values.grouped}
      lang={lang}
    />
  );
};
