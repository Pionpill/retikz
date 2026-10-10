import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';

import { rowOrganizationGroupByOf } from './row-organization.data';
import { rowOrganizationI18n } from './row-organization.i18n';
import type { RowSelectValues } from './row-select.data';
import { rowSelectRowsOf, rowSelectResultOf } from './row-select.data';

/** 选择图的控件与语言输入 */
export type RowSelectPreviewProps = RowSelectValues & { lang?: Lang };
/** 比较真实选择结果，排名关闭后保留稳定取景宽度 */
export const RowSelectPreview: FC<RowSelectPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = rowOrganizationI18n[lang];
  const rows = rowSelectRowsOf();
  const result = rowSelectResultOf(values);
  const fields = ['team', 'item', 'record', 'value'];
  const selectedRecords = new Set(result.map(row => row.record));
  return (
    <DataTransformComparison
      source={{
        dataRef: 'row-select-source',
        rows,
        columns: fields.map(field => ({ id: field, field, header: field })),
        caption: i18n.source,
        highlight: {
          columnIds: ['item', 'record', 'value'],
          rowIndices: rows.flatMap((row, index) => (selectedRecords.has(row.record) ? [index + 1] : [])),
        },
      }}
      result={{
        dataRef: 'row-select-result',
        rows: result,
        columns: [...fields, ...(values.ranked ? ['rank'] : [])].map(field => ({ id: field, field, header: field })),
        caption: i18n.selected,
        maxColumns: 5,
        highlight: { columnIds: ['item', 'record', 'value', ...(values.ranked ? ['rank'] : [])] },
      }}
      operation="max"
      host="select"
      context={
        rowOrganizationGroupByOf(values.group).length > 0
          ? `groupBy: ${rowOrganizationGroupByOf(values.group).join(', ')}`
          : i18n.allRows
      }
      emptyLabel={i18n.empty}
    />
  );
};
