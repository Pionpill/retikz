import { type ExternalRow, PlotTransform, type Transform } from '../ir';
import type { FieldCollector } from '../data';
import { aggregateOutputField, applyAggregate, applyBin, binOutputFields } from './group';
import {
  DEFAULT_DERIVE_END_FIELD,
  DEFAULT_DERIVE_START_FIELD,
  DEFAULT_END_FIELD,
  DEFAULT_START_FIELD,
  applyDeriveInterval,
  applyJitter,
  applyNormalize,
  applySort,
  applyStack,
} from './row';

export { aggregateOutputField, binOutputFields } from './group';

/** 收集 transform 读取的源字段，并登记 transform 派生输出字段以供 strict model 排除。 */
export const collectTransformFields = (transform: Transform, fields: FieldCollector, derivedOutputs: Set<string>): void => {
  switch (transform.kind) {
    case PlotTransform.Sort:
      fields.addField(transform.field);
      break;
    case PlotTransform.Stack:
      fields.addFields(transform.y, transform.x, transform.groupBy);
      derivedOutputs.add(transform.startField ?? DEFAULT_START_FIELD);
      derivedOutputs.add(transform.endField ?? DEFAULT_END_FIELD);
      break;
    case PlotTransform.Bin: {
      fields.addFields(transform.field, transform.reduceField);
      const out = binOutputFields(transform);
      derivedOutputs.add(out.startField);
      derivedOutputs.add(out.endField);
      derivedOutputs.add(out.valueField);
      break;
    }
    case PlotTransform.Aggregate:
      fields.addFields(...transform.groupBy, transform.field);
      derivedOutputs.add(aggregateOutputField(transform));
      break;
    case PlotTransform.Normalize:
      fields.addField(transform.field);
      if (transform.groupBy !== undefined) fields.addFields(...transform.groupBy);
      if (transform.as !== undefined) derivedOutputs.add(transform.as);
      break;
    case PlotTransform.DeriveInterval:
      fields.addFields(transform.from, transform.startFrom, transform.endFrom);
      derivedOutputs.add(transform.startField ?? DEFAULT_DERIVE_START_FIELD);
      derivedOutputs.add(transform.endField ?? DEFAULT_DERIVE_END_FIELD);
      break;
    case PlotTransform.Jitter:
      if (transform.axis === undefined || transform.axis === 'x' || transform.axis === 'both') fields.addField(transform.xField ?? 'x');
      if (transform.axis === 'y' || transform.axis === 'both') fields.addField(transform.yField ?? 'y');
      break;
  }
};

/**
 * 按声明顺序折叠应用 transform。
 * @description sort / stack / normalize / derive-interval / jitter 保行数；bin / aggregate 改行数。
 */
export const applyTransforms = (rows: Array<ExternalRow>, ops?: Array<Transform>): Array<ExternalRow> => {
  if (!ops || ops.length === 0) return rows;
  return ops.reduce((acc, op) => {
    switch (op.kind) {
      case PlotTransform.Sort:
        return applySort(acc, op);
      case PlotTransform.Stack:
        return applyStack(acc, op);
      case PlotTransform.Bin:
        return applyBin(acc, op);
      case PlotTransform.Aggregate:
        return applyAggregate(acc, op);
      case PlotTransform.Normalize:
        return applyNormalize(acc, op);
      case PlotTransform.DeriveInterval:
        return applyDeriveInterval(acc, op);
      case PlotTransform.Jitter:
        return applyJitter(acc, op);
    }
  }, rows);
};
