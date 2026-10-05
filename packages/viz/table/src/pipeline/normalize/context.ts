import type {
  DataFieldTypeMap,
  ExternalDatasets,
  IRDataReference,
  IRDataScalarValue,
  DataTransformResult,
} from '@retikz/data';
import { createDataView, resolveFieldPath, resolveFieldTypes, ScalarValueSchema } from '@retikz/data';

import type { TableStructureContext } from '../../contract/structure';
import { RetikzTableError } from '../../error';
import { deepFreeze } from '../../shared';

/** 构造不暴露原始 row 对象的 Structure Definition context */
export const createTableStructureContext = (
  data: IRDataReference | undefined,
  datasets: ExternalDatasets,
  preparedData?: DataTransformResult,
): TableStructureContext => {
  if (data === undefined) {
    return Object.freeze({
      resolveFieldTypes: () => new Map(),
      resolveField: () => undefined,
    });
  }

  const parsedData = structuredClone(data);
  if (preparedData === undefined && !Object.hasOwn(datasets, parsedData.reference)) {
    throw new RetikzTableError(`dataset "${parsedData.reference}" not found in provided datasets`);
  }

  const rows = preparedData?.rows ?? datasets[parsedData.reference];
  const sourceIndices = deepFreeze(rows.map((_, index) => index));
  const modelSource = preparedData?.model ?? parsedData.model;
  const model = modelSource === undefined ? undefined : deepFreeze(structuredClone(modelSource));
  const preparedView = preparedData === undefined ? undefined : createDataView(preparedData.rows, preparedData.model);

  const resolveScalarField = (sourceIndex: number, field: string): IRDataScalarValue | undefined => {
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= rows.length) {
      throw new RetikzTableError(`sourceIndex ${sourceIndex} is outside dataset "${parsedData.reference}"`);
    }

    const value = resolveFieldPath(rows[sourceIndex], field);
    if (value === undefined) return undefined;

    const scalar = ScalarValueSchema.safeParse(value);
    if (!scalar.success) {
      throw new RetikzTableError(`field "${field}" at sourceIndex ${sourceIndex} must resolve to a JSON scalar value`, {
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
    resolveFieldTypes: (sourceFields: ReadonlySet<string>) => {
      if (preparedView === undefined) return resolveFieldTypes(parsedData.model, rows, new Set(sourceFields));

      const declared = new Set(preparedView.model.map(field => field.name));

      for (const field of sourceFields)
        if (!declared.has(field)) throw new RetikzTableError(`unknown field "${field}" in prepared Table data model`);
      const types: DataFieldTypeMap = new Map();

      for (const field of preparedView.model) {
        if (sourceFields.has(field.name) && field.type !== undefined) types.set(field.name, field.type);
      }

      return types;
    },
    resolveField: resolveScalarField,
  });
};
