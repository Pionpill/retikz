import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { SelectorComparison } from './components';
import type { SelectorNthValues } from './selector-nth.data';
import { selectorNthRowsOf, selectorNthResultOf } from './selector-nth.data';

/** 指定位置示例的语言输入 */
export type SelectorNthPreviewProps = SelectorNthValues & { lang?: Lang };
/** 并排展示原始订单与实际选择结果 */
export const SelectorNthPreview: FC<SelectorNthPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <SelectorComparison
      rows={selectorNthRowsOf(values)}
      result={selectorNthResultOf(values)}
      operation={'nth'}
      grouped={values.grouped}
      lang={lang}
    />
  );
};
