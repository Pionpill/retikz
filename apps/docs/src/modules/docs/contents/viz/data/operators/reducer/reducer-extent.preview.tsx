import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ReducerComparison } from './components';
import type { ReducerExtentValues } from './reducer-extent.data';
import { reducerExtentRowsOf, reducerExtentResultOf } from './reducer-extent.data';
import { reducerExtentI18n } from './reducer-extent.i18n';

/** 数值范围示例的语言输入 */
export type ReducerExtentPreviewProps = ReducerExtentValues & { lang?: Lang };
/** 并排展示明细与实际规约结果 */
export const ReducerExtentPreview: FC<ReducerExtentPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  return (
    <ReducerComparison
      rows={reducerExtentRowsOf(values)}
      result={reducerExtentResultOf(values)}
      operation="extent"
      grouped={values.grouped}
      labels={reducerExtentI18n[lang]}
      maxResultColumns={3}
    />
  );
};
