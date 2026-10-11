import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataSortTransform } from '@retikz/data';

import { rowOrganizationRowsOf, rowOrganizationGroupByOf } from './row-organization.data';

/** 排序示例的可写输入 */
export type RowSortValues = { field: string; order: string; group: string };

/** 保留重复排序键与行标识，展示稳定排序 */
export const rowSortRowsOf = (): Array<ExternalRow> => rowOrganizationRowsOf();

/** 用公开 IR 声明单字段排序 */
export const rowSortOperationOf = (values: RowSortValues): IRDataSortTransform => ({
  kind: 'sort',
  params: {
    groupBy: rowOrganizationGroupByOf(values.group),
    field: values.field,
    order: values.order === 'descending' ? 'descending' : 'ascending',
  },
});

/** 执行真实排序，保留输入字段及行数 */
export const rowSortResultOf = (values: RowSortValues): Array<ExternalRow> =>
  applyTransforms(rowSortRowsOf(), [rowSortOperationOf(values)]).rows;
