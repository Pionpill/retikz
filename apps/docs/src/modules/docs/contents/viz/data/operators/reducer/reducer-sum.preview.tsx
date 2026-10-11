import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ReducerComparison } from './components';
import type { ReducerSumValues } from './reducer-sum.data';
import { reducerSumRowsOf, reducerSumResultOf } from './reducer-sum.data';
import { reducerSumI18n } from './reducer-sum.i18n';

/** 求和示例的语言输入 */
export type ReducerSumPreviewProps = ReducerSumValues & { lang?: Lang };
/** 并排展示明细与实际规约结果 */
export const ReducerSumPreview: FC<ReducerSumPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <ReducerComparison
      rows={reducerSumRowsOf(values)}
      result={reducerSumResultOf(values)}
      operation="sum"
      grouped={values.grouped}
      labels={reducerSumI18n[lang]}
    />
  );
};
