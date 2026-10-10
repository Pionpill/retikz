import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { SelectorComparison } from './components';
import type { SelectorExtremaValues } from './selector-extrema.data';
import { selectorExtremaRowsOf, selectorExtremaResultOf } from './selector-extrema.data';

/** 极值行示例的语言输入 */
export type SelectorExtremaPreviewProps = SelectorExtremaValues & { lang?: Lang };
/** 并排展示原始订单与实际选择结果 */
export const SelectorExtremaPreview: FC<SelectorExtremaPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <SelectorComparison
      rows={selectorExtremaRowsOf(values)}
      result={selectorExtremaResultOf(values)}
      operation={values.method === 'min' ? 'min' : 'max'}
      grouped={values.grouped}
      lang={lang}
    />
  );
};
