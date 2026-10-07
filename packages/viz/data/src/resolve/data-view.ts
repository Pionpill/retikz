import type { DataTransformModel, DataView } from '../contract';
import { RetikzDataError } from '../error';
import { resolveFieldPath } from '../providers';
import type { ExternalRow } from '../shared';

/** 从完整逻辑模型与规范值观测创建视图；不将额外 payload 升格为逻辑字段 */
export const createDataView = (
  rows: Array<ExternalRow>,
  model: Array<Pick<DataTransformModel[number], 'name' | 'type' | 'order'>>,
): DataView => ({
  rows,
  model: model.map(field => {
    const values =
      field.type === undefined
        ? rows
            .map(row => resolveFieldPath(row, field.name))
            .filter(value => value !== undefined && !(typeof value === 'number' && Number.isNaN(value)))
        : [];
    const type =
      field.type ??
      (values.length > 0 && values.every(value => typeof value === 'number' && Number.isFinite(value))
        ? 'continuous'
        : values.length > 0 && values.every(value => typeof value === 'string')
          ? 'categorical'
          : undefined);

    if (field.order !== undefined && type !== undefined && type !== 'categorical') {
      throw new RetikzDataError(
        `data: field "${field.name}" has order but resolves to ${type}; order only applies to categorical fields`,
      );
    }

    if (type === 'continuous' || type === 'temporal') return { name: field.name, type };
    return { ...field, type };
  }),
});
