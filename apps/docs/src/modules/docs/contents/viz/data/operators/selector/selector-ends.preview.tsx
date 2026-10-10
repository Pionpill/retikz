import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { SelectorComparison } from './components';
import type { SelectorEndsValues } from './selector-ends.data';
import { selectorEndsRowsOf, selectorEndsResultOf } from './selector-ends.data';

/** 首行与末行示例的语言输入 */
export type SelectorEndsPreviewProps = SelectorEndsValues & { lang?: Lang };
/** 并排展示原始订单与实际选择结果 */
export const SelectorEndsPreview: FC<SelectorEndsPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <SelectorComparison
      rows={selectorEndsRowsOf(values)}
      result={selectorEndsResultOf(values)}
      operation={values.method === 'last' ? 'last' : 'first'}
      grouped={values.grouped}
      lang={lang}
    />
  );
};
