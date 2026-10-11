import type { BuiltinReducerOperationKind, ExternalRow } from '@retikz/data';
import type { FC } from 'react';

import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';

import { reducerSourceRowIndicesOf } from '../source-highlights';

/** 规约演示的输入、实际输出和表格标注 */
export type ReducerComparisonProps = {
  /** 变换前的订单明细 */
  rows: Array<ExternalRow>;
  /** 数据 API 返回的汇总行 */
  result: Array<ExternalRow>;
  /** 本次计算的算子 kind */
  operation: BuiltinReducerOperationKind;
  /** 是否按 team 分组 */
  grouped: boolean;
  /** quantile 的概率；median 固定取中间位置 */
  p?: number;
  /** 固定取景需容纳的最大输出列数 */
  maxResultColumns?: number;
  /** 输出列宽 */
  resultColumnWidth?: number;
  /** 双语表格说明 */
  labels: { sourceOrders: string; summaryRows: string; allOrders: string };
};

/** 为共享比较图提供规约列和参与计算的原始行 */
export const ReducerComparison: FC<ReducerComparisonProps> = props => {
  const { rows, result, operation, grouped, p = 0.5, maxResultColumns = 2, resultColumnWidth = 76, labels } = props;
  const highlightedRows = reducerSourceRowIndicesOf(rows, grouped, operation, p);
  const fields = [...new Set(result.flatMap(row => Object.keys(row)))];
  const statisticFields = fields.filter(field => field !== 'team');

  return (
    <DataTransformComparison
      operation={operation}
      host="summarize"
      context={grouped ? 'groupBy: team' : labels.allOrders}
      source={{
        dataRef: 'orders',
        rows,
        columns: ['team', 'value'].map(field => ({ id: field, field, header: field })),
        caption: labels.sourceOrders,
        highlight: { columnIds: ['value'], rowIndices: highlightedRows.map(index => index + 1) },
      }}
      result={{
        dataRef: 'summary',
        rows: result,
        columns: fields.map(field => ({
          id: field,
          field,
          header: field,
          ...(result.some(row => typeof row[field] === 'number')
            ? { formatter: { name: 'number', options: { specifier: '.3~f' } } }
            : {}),
        })),
        caption: labels.summaryRows,
        columnWidth: resultColumnWidth,
        maxColumns: maxResultColumns,
        highlight: { columnIds: statisticFields },
      }}
    />
  );
};
