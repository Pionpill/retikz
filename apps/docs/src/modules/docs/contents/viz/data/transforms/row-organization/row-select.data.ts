import { applyTransforms } from '@retikz/data';
import type { ExternalRow, IRDataSelectTransform } from '@retikz/data';

import { rowOrganizationRowsOf, rowOrganizationGroupByOf } from './row-organization.data';

/** 选择宿主示例的可写输入 */
export type RowSelectValues = { group: string; ranked: boolean };

/** 共享重复商品与记录样本，组合分组包含并列最大值 */
export const rowSelectRowsOf = (): Array<ExternalRow> => rowOrganizationRowsOf();

/** 固定选择全部并列最大值，控件只改变宿主参数 */
export const rowSelectOperationOf = (values: RowSelectValues): IRDataSelectTransform => ({
  kind: 'select',
  params: {
    groupBy: rowOrganizationGroupByOf(values.group),
    selector: { kind: 'max', by: 'value', tie: 'all' },
    ...(values.ranked ? { rankAs: 'rank' } : {}),
  },
});

/** 执行真实选择，输出所选原始记录及可选排名 */
export const rowSelectResultOf = (values: RowSelectValues): Array<ExternalRow> =>
  applyTransforms(rowSelectRowsOf(), [rowSelectOperationOf(values)]).rows;
