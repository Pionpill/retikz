import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ReducerComparison } from './components';
import type { ReducerExtremaValues } from './reducer-extrema.data';
import { reducerExtremaRowsOf, reducerExtremaResultOf } from './reducer-extrema.data';
import { reducerExtremaI18n } from './reducer-extrema.i18n';

/** 最小值与最大值示例的语言输入 */
export type ReducerExtremaPreviewProps = ReducerExtremaValues & { lang?: Lang };
/** 并排展示明细与实际规约结果 */
export const ReducerExtremaPreview: FC<ReducerExtremaPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <ReducerComparison
      rows={reducerExtremaRowsOf(values)}
      result={reducerExtremaResultOf(values)}
      operation={values.method === 'max' ? 'max' : 'min'}
      grouped={values.grouped}
      labels={reducerExtremaI18n[lang]}
    />
  );
};
