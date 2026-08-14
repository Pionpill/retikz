import type { IRCustomTableSpec, IRDetailTableSpec, IRManualTableSpec, IRTableSpec } from '@retikz/table';

import { createDetailTableSpec, createManualTableSpec, TABLE_NAMESPACE, TableComposite } from '@retikz/table';

import type { InputTableSpec } from './types';

import { InputTableKind } from './types';

/** 将 Table authoring 输入归一化为唯一的 Table Source IR */
export const normalizeTable = (table: InputTableSpec): IRTableSpec => {
  switch (table.kind) {
    case InputTableKind.Detail:
      return createDetailTableSpec(table.input);
    case InputTableKind.Manual:
      return createManualTableSpec(table.input);
    case InputTableKind.Custom:
      return {
        namespace: TABLE_NAMESPACE,
        type: TableComposite.Table,
        ...table.input,
      };
  }
};

/** 将既有 Table Source IR 还原为可再次归一化的 authoring 输入 */
export const inputTableFromSpec = (spec: IRTableSpec): InputTableSpec => {
  if (spec.structure.kind === InputTableKind.Detail) {
    const detail = spec as IRDetailTableSpec;
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
    const manual = spec as IRManualTableSpec;
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
  const custom = spec as IRCustomTableSpec;
  const { namespace: _namespace, type: _type, ...input } = custom;
  void _namespace;
  void _type;
  return { kind: InputTableKind.Custom, input };
};
