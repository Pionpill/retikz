import type { DataTransformModel, DataView } from '../contract';
import { resolveFieldPath } from '../providers';
import type { ExternalRow } from '../shared';

/** 从完整逻辑模型与规范值观测创建视图；不将额外 payload 升格为逻辑字段 */
export const createDataView = (rows: Array<ExternalRow>, model: DataTransformModel): DataView => ({
  rows,
  model: model.map(field => {
    if (field.type !== undefined) return { ...field };

    const values = rows
      .map(row => resolveFieldPath(row, field.name))
      .filter(value => value !== undefined && !(typeof value === 'number' && Number.isNaN(value)));
    const type =
      values.length > 0 && values.every(value => typeof value === 'number' && Number.isFinite(value))
        ? 'continuous'
        : values.length > 0 && values.every(value => typeof value === 'string')
          ? 'categorical'
          : undefined;

    return type === undefined ? { ...field } : { ...field, type };
  }),
});
