import { resolveFieldPath } from '../data';
import { type DeriveRelationTransform, type ExternalRow, type RelationEndpointSelector } from '../../schemas';

type SelectedRelationRows = {
  groupValues: Record<string, unknown>;
  source: ExternalRow;
  target: ExternalRow;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export const relationEndpointOutputField = (prefix: 'source' | 'target', suffix: string): string => `${prefix}${capitalize(suffix)}`;

export const relationMeasureOutputFields = (operation: DeriveRelationTransform): Array<string> => {
  if (operation.measure === undefined) return [];
  return [operation.measure.as ?? 'delta', operation.measure.labelAs].filter((field): field is string => field !== undefined);
};

export const deriveRelationInputFields = (operation: DeriveRelationTransform): Array<string> => {
  const endpointFields = (selector: RelationEndpointSelector): Array<string> => [
    ...(selector.groupBy ?? []),
    ...(selector.by !== undefined ? [selector.by] : []),
    ...Object.values(selector.fields),
  ];
  return [
    ...(operation.groupBy ?? []),
    ...endpointFields(operation.source),
    ...endpointFields(operation.target),
    ...(operation.measure !== undefined ? [operation.measure.field] : []),
  ];
};

export const deriveRelationOutputFields = (operation: DeriveRelationTransform): Array<string> => [
  ...Object.keys(operation.source.fields).map(field => relationEndpointOutputField('source', field)),
  ...Object.keys(operation.target.fields).map(field => relationEndpointOutputField('target', field)),
  ...relationMeasureOutputFields(operation),
];

const sameGroupFields = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
  left.length === right.length && left.every((field, index) => field === right[index]);

const relationGroupFields = (operation: DeriveRelationTransform): Array<string> => {
  const sourceGroup = operation.source.groupBy ?? operation.groupBy ?? [];
  const targetGroup = operation.target.groupBy ?? operation.groupBy ?? [];
  if (!sameGroupFields(sourceGroup, targetGroup)) {
    throw new Error('lowerPlots: derive-relation source and target endpoint groupBy fields must match');
  }
  return sourceGroup;
};

const groupKeyOf = (row: ExternalRow, groupBy: ReadonlyArray<string>): string =>
  JSON.stringify(groupBy.map(field => resolveFieldPath(row, field)));

const groupRows = (rows: Array<ExternalRow>, groupBy: ReadonlyArray<string>): Array<{ key: string; rows: Array<ExternalRow>; values: Record<string, unknown> }> => {
  if (groupBy.length === 0) return [{ key: '__all__', rows, values: {} }];
  const groups = new Map<string, { key: string; rows: Array<ExternalRow>; values: Record<string, unknown> }>();
  for (const row of rows) {
    const key = groupKeyOf(row, groupBy);
    const found = groups.get(key);
    if (found !== undefined) {
      found.rows.push(row);
      continue;
    }
    const values: Record<string, unknown> = {};
    for (const field of groupBy) values[field] = resolveFieldPath(row, field);
    groups.set(key, { key, rows: [row], values });
  }
  return [...groups.values()];
};

const compareValues = (left: unknown, right: unknown): number => {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  return left < right ? -1 : 1;
};

const selectEndpointRow = (rows: Array<ExternalRow>, selector: RelationEndpointSelector): ExternalRow | undefined => {
  if (rows.length === 0) return undefined;
  if (selector.select === 'first') {
    if (selector.by === undefined) return rows[0];
    const by = selector.by;
    return [...rows].sort((left, right) => compareValues(resolveFieldPath(left, by), resolveFieldPath(right, by)))[0];
  }
  if (selector.select === 'last') {
    if (selector.by === undefined) return rows[rows.length - 1];
    const by = selector.by;
    const sorted = [...rows].sort((left, right) => compareValues(resolveFieldPath(left, by), resolveFieldPath(right, by)));
    return sorted[sorted.length - 1];
  }

  const by = selector.by;
  if (by === undefined) return undefined;
  let selected: ExternalRow | undefined;
  let selectedValue: number | undefined;
  for (const row of rows) {
    const value = resolveFieldPath(row, by);
    if (!isFiniteNumber(value)) continue;
    if (selected === undefined || selectedValue === undefined) {
      selected = row;
      selectedValue = value;
      continue;
    }
    const better = selector.select === 'min' ? value < selectedValue : value > selectedValue;
    const tied = value === selectedValue && selector.tie === 'last';
    if (better || tied) {
      selected = row;
      selectedValue = value;
    }
  }
  return selected;
};

const selectedRowsOf = (rows: Array<ExternalRow>, operation: DeriveRelationTransform): Array<SelectedRelationRows> => {
  const groupBy = relationGroupFields(operation);
  return groupRows(rows, groupBy).flatMap(group => {
    const source = selectEndpointRow(group.rows, operation.source);
    const target = selectEndpointRow(group.rows, operation.target);
    return source === undefined || target === undefined ? [] : [{ groupValues: group.values, source, target }];
  });
};

const endpointFieldsOf = (prefix: 'source' | 'target', selector: RelationEndpointSelector, row: ExternalRow): ExternalRow => {
  const out: ExternalRow = {};
  for (const [suffix, sourceField] of Object.entries(selector.fields)) {
    out[relationEndpointOutputField(prefix, suffix)] = resolveFieldPath(row, sourceField);
  }
  return out;
};

const measureFieldsOf = (operation: DeriveRelationTransform, source: ExternalRow, target: ExternalRow): ExternalRow => {
  const measure = operation.measure;
  if (measure === undefined) return {};
  const sourceValue = Number(resolveFieldPath(source, measure.field));
  const targetValue = Number(resolveFieldPath(target, measure.field));
  const delta = targetValue - sourceValue;
  const out: ExternalRow = { [measure.as ?? 'delta']: delta };
  if (measure.labelAs !== undefined) {
    const prefix = measure.labelPrefix !== undefined && delta >= 0 ? measure.labelPrefix : '';
    out[measure.labelAs] = `${prefix}${delta}`;
  }
  return out;
};

export const applyDeriveRelation = (rows: Array<ExternalRow>, operation: DeriveRelationTransform): Array<ExternalRow> =>
  selectedRowsOf(rows, operation).map(({ groupValues, source, target }) => ({
    ...groupValues,
    ...endpointFieldsOf('source', operation.source, source),
    ...endpointFieldsOf('target', operation.target, target),
    ...measureFieldsOf(operation, source, target),
  }));
