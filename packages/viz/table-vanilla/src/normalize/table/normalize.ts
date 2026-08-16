import type { IRCustomTable, IRDetailTable, IRManualTable, IRTable } from '@retikz/table';

import { createDetailTableIR, createManualTableIR, TABLE_NAMESPACE, TableComposite } from '@retikz/table';

import type { InputTableVariant } from './types';

import { InputTableKind } from './types';

/** 将 Table authoring 输入归一化为唯一的 Table Source IR */
export const normalizeTable = (table: InputTableVariant): IRTable => {
  switch (table.kind) {
    case InputTableKind.Detail:
      return createDetailTableIR(table.input);
    case InputTableKind.Manual:
      return createManualTableIR(table.input);
    case InputTableKind.Custom:
      return {
        namespace: TABLE_NAMESPACE,
        type: TableComposite.Table,
        ...table.input,
      };
  }
};

/** 将既有 Table Source IR 还原为可再次归一化的 authoring 输入 */
export const inputTableFromIR = (spec: IRTable): InputTableVariant => {
  if (spec.structure.kind === InputTableKind.Detail) {
    const detail = spec as IRDetailTable;
    const { namespace: _namespace, type: _type, data, structure, ...input } = detail;
    void _namespace;
    void _type;
    return {
      kind: InputTableKind.Detail,
      input: {
        ...input,
        dataRef: data.reference,
        ...(data.model === undefined ? {} : { model: data.model }),
        columns: structure.columns,
        ...(structure.header === undefined ? {} : { header: structure.header }),
      },
    };
  }
  if (spec.structure.kind === InputTableKind.Manual) {
    const manual = spec as IRManualTable;
    const { namespace: _namespace, type: _type, structure, ...input } = manual;
    void _namespace;
    void _type;
    return {
      kind: InputTableKind.Manual,
      input: {
        ...input,
        rows: structure.rows,
        ...(structure.rowKinds === undefined ? {} : { rowKinds: structure.rowKinds }),
      },
    };
  }
  const custom = spec as IRCustomTable;
  const { namespace: _namespace, type: _type, ...input } = custom;
  void _namespace;
  void _type;
  return { kind: InputTableKind.Custom, input };
};
