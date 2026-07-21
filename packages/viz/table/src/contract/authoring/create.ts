import type { IRTableDetailColumn, IRTableSpec } from '../../schemas';
import type { DetailTableSpecInput, ManualTableSpecInput, TableDetailColumnInput } from './types';

import { TABLE_NAMESPACE, TableComposite, TableSpecSchema } from '../../schemas';

/** 把 detail column 的字符串列头规范化为 value payload */
const normalizeDetailColumn = (column: TableDetailColumnInput): IRTableDetailColumn => {
  const { header, ...fields } = column;
  if (header === undefined) return fields;
  return {
    ...fields,
    header: typeof header === 'string' ? { kind: 'value', value: header } : header,
  };
};

/** 从 plain detail 输入构造 schema-valid Table spec */
export const createDetailTableSpec = (input: DetailTableSpecInput): IRTableSpec => {
  const { dataRef, model, columns, header, ...root } = input;
  return TableSpecSchema.parse({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    ...root,
    data: {
      reference: dataRef,
      ...(model === undefined ? {} : { model }),
    },
    structure: {
      kind: 'detail',
      columns: columns.map(normalizeDetailColumn),
      ...(header === undefined ? {} : { header }),
    },
  });
};

/** 从 plain manual 输入构造 schema-valid Table spec */
export const createManualTableSpec = (input: ManualTableSpecInput): IRTableSpec => {
  const { rows, columns, rowKinds, cells, ...root } = input;
  return TableSpecSchema.parse({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    ...root,
    structure: {
      kind: 'manual',
      rows,
      columns,
      ...(rowKinds === undefined ? {} : { rowKinds }),
      cells,
    },
  });
};
