import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ReducerComparison } from './components';
import type { ReducerQuantileValues } from './reducer-quantile.data';
import { reducerQuantileRowsOf, reducerQuantileResultOf } from './reducer-quantile.data';
import { reducerQuantileI18n } from './reducer-quantile.i18n';

/** 分位数示例的语言输入 */
export type ReducerQuantilePreviewProps = ReducerQuantileValues & { lang?: Lang };
/** 并排展示明细与实际规约结果 */
export const ReducerQuantilePreview: FC<ReducerQuantilePreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <ReducerComparison
      rows={reducerQuantileRowsOf(values)}
      result={reducerQuantileResultOf(values)}
      operation="quantile"
      grouped={values.grouped}
      p={values.p}
      labels={reducerQuantileI18n[lang]}
    />
  );
};
