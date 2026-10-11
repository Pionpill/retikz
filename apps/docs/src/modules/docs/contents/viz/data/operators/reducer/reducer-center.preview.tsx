import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ReducerComparison } from './components';
import type { ReducerCenterValues } from './reducer-center.data';
import { reducerCenterRowsOf, reducerCenterResultOf } from './reducer-center.data';
import { reducerCenterI18n } from './reducer-center.i18n';

/** 均值与中位数示例的语言输入 */
export type ReducerCenterPreviewProps = ReducerCenterValues & { lang?: Lang };
/** 并排展示明细与实际规约结果 */
export const ReducerCenterPreview: FC<ReducerCenterPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <ReducerComparison
      rows={reducerCenterRowsOf(values)}
      result={reducerCenterResultOf(values)}
      operation={values.method === 'median' ? 'median' : 'mean'}
      grouped={values.grouped}
      labels={reducerCenterI18n[lang]}
    />
  );
};
