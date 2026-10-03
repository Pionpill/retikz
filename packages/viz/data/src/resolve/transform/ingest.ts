import type { DataTransformModel, DataTransformResolution, DataTransformResult, DataView } from '../../contract';
import { RetikzDataError } from '../../error';
import { resolveFieldPath } from '../../providers';
import { createDataView } from '../data-view';

/** 检查完整模型和已证明字段类型，不重复应用源 parser */
export const assertDataTransformModel = (expected: DataTransformModel, actual: DataTransformModel): void => {
  const names = new Set(actual.map(field => field.name));
  if (names.size !== actual.length || actual.length !== expected.length)
    throw new RetikzDataError('data: result field model does not match the expected output');
  for (const field of expected) {
    const found = actual.find(candidate => candidate.name === field.name);
    if (
      found === undefined ||
      (field.type !== undefined && found.type !== field.type) ||
      JSON.stringify(found.order) !== JSON.stringify(field.order)
    ) {
      throw new RetikzDataError(`data: result model does not match field "${field.name}"`);
    }
  }
};

/** 检查规范结果的值域，未知和非标量字段不伪装测量类型 */
export const assertDataTransformResult = (expected: DataTransformModel, result: DataTransformResult): void => {
  assertDataTransformModel(expected, result.model);
  for (const field of result.model) {
    if (field.type === undefined) continue;
    for (const row of result.rows) {
      const value = resolveFieldPath(row, field.name);
      if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) continue;
      const valid =
        field.type === 'categorical'
          ? typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
          : typeof value === 'number' && Number.isFinite(value);
      if (!valid) throw new RetikzDataError(`data: result value does not match field "${field.name}"`);
    }
  }
};

/** 接入规范结果的完整模型；空行仍保留未定字段与分类顺序 */
export const ingestDataTransformResult = (
  resolution: DataTransformResolution,
  result: DataTransformResult,
): DataView => {
  const expected = resolution.stages.at(-1)?.outputModel ?? resolution.inputModel;
  assertDataTransformResult(expected, result);
  return createDataView(result.rows, result.model);
};
