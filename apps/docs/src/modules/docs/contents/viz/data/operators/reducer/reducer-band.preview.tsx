import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ReducerComparison } from './components';
import type { ReducerBandValues } from './reducer-band.data';
import { reducerBandRowsOf, reducerBandResultOf } from './reducer-band.data';
import { reducerBandI18n } from './reducer-band.i18n';

/** 分位区间示例的语言输入 */
export type ReducerBandPreviewProps = ReducerBandValues & { lang?: Lang };
/** 并排展示明细与实际规约结果 */
export const ReducerBandPreview: FC<ReducerBandPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <ReducerComparison
      rows={reducerBandRowsOf(values)}
      result={reducerBandResultOf(values)}
      operation="quantile-band"
      grouped={values.grouped}
      labels={reducerBandI18n[lang]}
      maxResultColumns={7}
    />
  );
};
