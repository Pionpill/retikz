import type { ExternalRow } from '@retikz/data';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';

import { selectorComparisonI18n } from '../comparison.i18n';

/** 选择算子演示的原始记录、实际结果与语言 */
export type SelectorComparisonProps = {
  /** 原始订单；item 唯一标识本数据集的记录 */
  rows: Array<ExternalRow>;
  /** 实际 select 输出，包含原始字段及 rank */
  result: Array<ExternalRow>;
  /** 正在演示的选择算子 */
  operation: string;
  /** 是否按 team 分组 */
  grouped: boolean;
  /** 文档语言 */
  lang?: Lang;
};

/** 为共享比较图提供选择结果列和所选原始记录，组键保持普通颜色 */
export const SelectorComparison: FC<SelectorComparisonProps> = props => {
  const { rows, result, operation, grouped, lang = 'zh' } = props;
  const i18n = selectorComparisonI18n[lang];
  const selectedItems = new Set(result.map(row => row.item));
  const selectedRowIndices = rows.flatMap((row, index) => (selectedItems.has(row.item) ? [index + 1] : []));

  return (
    <DataTransformComparison
      operation={operation}
      host="select"
      context={grouped ? 'groupBy: team' : i18n.allOrders}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'orders',
        rows,
        columns: ['team', 'item', 'value'].map(field => ({ id: field, field, header: field })),
        caption: i18n.sourceOrders,
        highlight: { columnIds: ['item', 'value'], rowIndices: selectedRowIndices },
      }}
      result={{
        dataRef: 'selected',
        rows: result,
        columns: ['team', 'item', 'value', 'rank'].map(field => ({ id: field, field, header: field })),
        caption: i18n.selectedRows,
        highlight: { columnIds: ['item', 'value', 'rank'] },
      }}
    />
  );
};
