import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { SelectorComparison } from './components';
import type { SelectorOutsideValues } from './selector-outside.data';
import { selectorOutsideRowsOf, selectorOutsideResultOf } from './selector-outside.data';

/** 分位区间外的行示例的语言输入 */
export type SelectorOutsidePreviewProps = SelectorOutsideValues & { lang?: Lang };
/** 并排展示原始订单与实际选择结果 */
export const SelectorOutsidePreview: FC<SelectorOutsidePreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <SelectorComparison
      rows={selectorOutsideRowsOf(values)}
      result={selectorOutsideResultOf(values)}
      operation={'outside-quantile-band'}
      grouped={values.grouped}
      lang={lang}
    />
  );
};
