import type { ExternalDatasets, IRDataReference, IRDataScalarValue } from '@retikz/data';

import { DataReferenceSchema, resolveFieldPath, resolveFieldTypes, ScalarValueSchema } from '@retikz/data';

import type { TableStructureContext } from '../../contract/structure';

import { deepFreeze } from '../../shared';

/** 构造不暴露原始 row 对象的 Structure Definition context */
export const createTableStructureContext = (
  data: IRDataReference | undefined,
  datasets: ExternalDatasets,
): TableStructureContext => {
  if (data === undefined) {
    return Object.freeze({
      resolveFieldTypes: () => new Map(),
      resolveField: () => undefined,
    });
  }

  const parsedData = DataReferenceSchema.parse(data);
  if (!Object.hasOwn(datasets, parsedData.reference)) {
    throw new Error(`dataset "${parsedData.reference}" not found in provided datasets`);
  }
  const rows = datasets[parsedData.reference];
  const sourceIndices = deepFreeze(rows.map((_, index) => index));
  const model = parsedData.model === undefined ? undefined : deepFreeze(parsedData.model);

  const resolveScalarField = (sourceIndex: number, field: string): IRDataScalarValue | undefined => {
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= rows.length) {
      throw new Error(`sourceIndex ${sourceIndex} is outside dataset "${parsedData.reference}"`);
    }
    const value = resolveFieldPath(rows[sourceIndex], field);
    if (value === undefined) return undefined;
    const scalar = ScalarValueSchema.safeParse(value);
    if (!scalar.success) {
      throw new Error(`field "${field}" at sourceIndex ${sourceIndex} must resolve to a JSON scalar value`, {
        cause: scalar.error,
      });
    }
    return scalar.data;
  };

  return Object.freeze({
    data: Object.freeze({
      reference: parsedData.reference,
      ...(model === undefined ? {} : { model }),
      sourceIndices,
    }),
    resolveFieldTypes: (sourceFields: ReadonlySet<string>) =>
      resolveFieldTypes(parsedData.model, rows, new Set(sourceFields)),
    resolveField: resolveScalarField,
  });
};
