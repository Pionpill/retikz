import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';

import { rowOrganizationGroupByOf } from './row-organization.data';
import { rowOrganizationI18n } from './row-organization.i18n';
import type { RowSortValues } from './row-sort.data';
import { rowSortRowsOf, rowSortResultOf } from './row-sort.data';

/** 排序图的控件与语言输入 */
export type RowSortPreviewProps = RowSortValues & { lang?: Lang };
/** 标记参与排序的全部输入记录及对应输出，包括位置未变化的记录 */
export const RowSortPreview: FC<RowSortPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = rowOrganizationI18n[lang];
  const rows = rowSortRowsOf();
  const result = rowSortResultOf(values);
  const columns = ['team', 'item', 'record', 'value'].map(field => ({ id: field, field, header: field }));
  return (
    <DataTransformComparison
      source={{
        dataRef: 'row-sort-source',
        rows,
        columns,
        caption: i18n.source,
        highlight: {
          columnIds: values.field === 'value' ? ['item', 'record', 'value'] : ['item'],
          rowIndices: rows.map((_, index) => index + 1),
        },
      }}
      result={{
        dataRef: 'row-sort-result',
        rows: result,
        columns,
        caption: i18n.sorted,
        highlight: { columnIds: ['item', 'record', 'value'], rowIndices: result.map((_, index) => index + 1) },
      }}
      operation="sort"
      host={values.field}
      context={
        rowOrganizationGroupByOf(values.group).length > 0
          ? `groupBy: ${rowOrganizationGroupByOf(values.group).join(', ')}`
          : i18n.allRows
      }
    />
  );
};
