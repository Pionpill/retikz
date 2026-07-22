import type { IRDetailTableSpec, IRManualTableSpec, IRTableDetailColumn } from '../../schemas';
import type { DetailTableSpecInput, ManualTableSpecInput, TableDetailColumnInput } from './types';

import {
  DetailTableSpecSchema,
  ManualTableSpecSchema,
  TABLE_NAMESPACE,
  TableCellPayloadKind,
  TableComposite,
  TableStructureKind,
} from '../../schemas';

/** 把 detail column 的字符串列头规范化为 value payload */
const normalizeDetailColumn = (column: TableDetailColumnInput): IRTableDetailColumn => {
  const { header, ...fields } = column;
  if (header === undefined) return fields;
  return {
    ...fields,
    header: typeof header === 'string' ? { kind: TableCellPayloadKind.Value, value: header } : header,
  };
};

/** 从 plain detail 输入构造 schema-valid Table spec */
export const createDetailTableSpec = (input: DetailTableSpecInput): IRDetailTableSpec => {
  const { dataRef, model, columns, header, ...root } = input;
  return DetailTableSpecSchema.parse({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    ...root,
    data: {
      reference: dataRef,
      ...(model === undefined ? {} : { model }),
    },
    structure: {
      kind: TableStructureKind.Detail,
      columns: columns.map(normalizeDetailColumn),
      ...(header === undefined ? {} : { header }),
    },
  });
};

/** 从 plain manual 输入构造 schema-valid Table spec */
export const createManualTableSpec = (input: ManualTableSpecInput): IRManualTableSpec => {
  const { rows, columns, rowKinds, cells, ...root } = input;
  return ManualTableSpecSchema.parse({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    ...root,
    structure: {
      kind: TableStructureKind.Manual,
      rows,
      columns,
      ...(rowKinds === undefined ? {} : { rowKinds }),
      cells,
    },
  });
};
