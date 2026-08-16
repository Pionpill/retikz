import type { IRDetailTable, IRManualTable, IRTableDetailColumn } from '../../schemas';
import type { DetailTableInput, ManualTableInput, TableDetailColumnInput } from './types';

import {
  DetailTableSchema,
  ManualTableSchema,
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
export const createDetailTableIR = (input: DetailTableInput): IRDetailTable => {
  const { dataRef, model, columns, header, ...root } = input;
  return DetailTableSchema.parse({
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
export const createManualTableIR = (input: ManualTableInput): IRManualTable => {
  const { rows, rowKinds, ...root } = input;
  return ManualTableSchema.parse({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    ...root,
    structure: {
      kind: TableStructureKind.Manual,
      rows,
      ...(rowKinds === undefined ? {} : { rowKinds }),
    },
  });
};
