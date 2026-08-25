import type { IRDataScalarValue } from '@retikz/data';

import type { SemanticTableCell } from '../../contract';
import type { IRTableCellSelector, IRTableValuePredicate } from '../../schemas';

import { TableCellPayloadKind, TableValueCompareOperator, TableValuePredicateKind } from '../../schemas';
import { TableCellSourceKind } from '../../shared';

/** 判断 raw scalar 是否满足闭合 Table value predicate */
export const matchesTableValuePredicate = (value: IRDataScalarValue, predicate: IRTableValuePredicate): boolean => {
  switch (predicate.kind) {
    case TableValuePredicateKind.Equal:
      return value === predicate.value;
    case TableValuePredicateKind.OneOf:
      return predicate.values.some(candidate => candidate === value);
    case TableValuePredicateKind.Compare: {
      if (typeof value !== typeof predicate.value || (typeof value !== 'string' && typeof value !== 'number')) {
        return false;
      }
      switch (predicate.operator) {
        case TableValueCompareOperator.LessThan:
          return value < predicate.value;
        case TableValueCompareOperator.LessThanOrEqual:
          return value <= predicate.value;
        case TableValueCompareOperator.GreaterThan:
          return value > predicate.value;
        case TableValueCompareOperator.GreaterThanOrEqual:
          return value >= predicate.value;
      }
      return false;
    }
    case TableValuePredicateKind.Between: {
      if (typeof value !== typeof predicate.min || typeof predicate.min !== typeof predicate.max) return false;
      if (typeof value !== 'string' && typeof value !== 'number') return false;
      const lower = predicate.includeMin === false ? value > predicate.min : value >= predicate.min;
      const upper = predicate.includeMax === false ? value < predicate.max : value <= predicate.max;
      return lower && upper;
    }
    case TableValuePredicateKind.Null:
      return predicate.isNull === false ? value !== null : value === null;
  }
};

/** 判断 canonical Cell 是否满足平直 Table selector */
export const matchesTableCellSelector = (cell: SemanticTableCell, selector: IRTableCellSelector): boolean => {
  if (selector.value !== undefined && cell.payload.kind !== TableCellPayloadKind.Value) return false;

  const matches =
    (selector.cellIds === undefined || (cell.id !== undefined && selector.cellIds.includes(cell.id))) &&
    (selector.rowIds === undefined || (cell.rowId !== undefined && selector.rowIds.includes(cell.rowId))) &&
    (selector.columnIds === undefined || (cell.columnId !== undefined && selector.columnIds.includes(cell.columnId))) &&
    (selector.rowIndices === undefined || selector.rowIndices.includes(cell.rowIndex)) &&
    (selector.columnIndices === undefined || selector.columnIndices.includes(cell.columnIndex)) &&
    (selector.locations === undefined || selector.locations.includes(cell.location)) &&
    (selector.roles?.any === undefined || selector.roles.any.some(role => cell.roles.includes(role))) &&
    (selector.roles?.all === undefined || selector.roles.all.every(role => cell.roles.includes(role))) &&
    (selector.sourceKinds === undefined ||
      (cell.source !== undefined && selector.sourceKinds.includes(cell.source.kind))) &&
    (selector.fields === undefined ||
      (cell.source?.kind === TableCellSourceKind.Field && selector.fields.includes(cell.source.field))) &&
    (selector.payloadKinds === undefined || selector.payloadKinds.includes(cell.payload.kind)) &&
    (selector.value === undefined ||
      (cell.payload.kind === TableCellPayloadKind.Value &&
        matchesTableValuePredicate(cell.payload.value, selector.value)));

  return selector.negate === true ? !matches : matches;
};
