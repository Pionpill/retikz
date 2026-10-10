import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ReducerComparison } from './components';
import type { ReducerCountValues } from './reducer-count.data';
import { reducerCountResultOf, reducerCountRows } from './reducer-count.data';
import { reducerCountI18n } from './reducer-count.i18n';

/** 计数示例的语言输入 */
export type ReducerCountPreviewProps = ReducerCountValues & { lang?: Lang };

/** 并排展示原始订单与 summarize 的真实结果，以主强调色标记新增计数列 */
export const ReducerCountPreview: FC<ReducerCountPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = reducerCountI18n[lang];
  return (
    <ReducerComparison
      rows={reducerCountRows}
      result={reducerCountResultOf(values)}
      operation="count"
      grouped={values.grouped}
      resultColumnWidth={70}
      labels={{ sourceOrders: i18n.sourceOrders, summaryRows: i18n.orderCounts, allOrders: i18n.allOrders }}
    />
  );
};
