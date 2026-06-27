import { isFiniteNumber } from '@retikz/math';
import { z } from 'zod';
import {
  type AnyRowSelectorDefinition,
  type AnyStatReducerDefinition,
  type RowSelection,
  type StatReducerContext,
  defineRowSelector,
  defineStatReducer,
  extractStatisticOperation,
} from '../../contract';
import { type ExternalRow, type OrderBy, type ReducerOperation, type SelectorOperation } from '../../schemas';
import { resolveFieldPath } from '../data';

const compareValues = (left: unknown, right: unknown): number => {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  return left < right ? -1 : 1;
};

const finiteValuesOf = (rows: Array<ExternalRow>, field: string): Array<number> => {
  const values: Array<number> = [];
  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) values.push(value);
  }
  return values;
};

const medianOf = (values: Array<number>): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const quantileOf = (values: Array<number>, p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  const weight = index - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
};

const orderRows = (rows: Array<ExternalRow>, orderBy?: Array<OrderBy>): Array<ExternalRow> => {
  if (orderBy === undefined || orderBy.length === 0) return [...rows];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      for (const order of orderBy) {
        const direction = order.order === 'descending' ? -1 : 1;
        const compared = compareValues(resolveFieldPath(left.row, order.field), resolveFieldPath(right.row, order.field));
        if (compared !== 0) return compared * direction;
      }
      return left.index - right.index;
    })
    .map(entry => entry.row);
};

const rankedByNumericField = (rows: Array<ExternalRow>, field: string, direction: 'ascending' | 'descending'): Array<ExternalRow> =>
  rows
    .map((row, index) => ({ row, index, value: resolveFieldPath(row, field) }))
    .filter((entry): entry is { row: ExternalRow; index: number; value: number } => isFiniteNumber(entry.value))
    .sort((left, right) => {
      const compared = left.value === right.value ? 0 : left.value < right.value ? -1 : 1;
      const directed = direction === 'ascending' ? compared : -compared;
      return directed === 0 ? left.index - right.index : directed;
    })
    .map(entry => entry.row);

const countReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('count'),
    as: z.string().min(1),
  }),
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: rows.length }),
});

const sumReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('sum'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: finiteValuesOf(rows, operation.field).reduce((sum, value) => sum + value, 0) }),
});

const meanReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('mean'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length };
  },
});

const medianReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('median'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: medianOf(finiteValuesOf(rows, operation.field)) }),
});

const minReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('min'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : Math.min(...values) };
  },
});

const maxReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('max'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? 0 : Math.max(...values) };
  },
});

const extentReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('extent'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => {
    const values = finiteValuesOf(rows, operation.field);
    return { [operation.as]: values.length === 0 ? [0, 0] : [Math.min(...values), Math.max(...values)] };
  },
});

const quantileReducerDefinition = defineStatReducer({
  schema: z.object({
    op: z.literal('quantile'),
    field: z.string().min(1),
    p: z.number().min(0).max(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({ [operation.as]: quantileOf(finiteValuesOf(rows, operation.field), operation.p) }),
});

const minSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal('min'),
    by: z.string().min(1),
    tie: z.enum(['first', 'last', 'all']).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, 'ascending');
    if (ranked.length === 0) return [];
    if (operation.tie === 'all') {
      const value = resolveFieldPath(ranked[0], operation.by);
      return ranked.filter(row => resolveFieldPath(row, operation.by) === value).map((row, index) => ({ row, rank: index + 1 }));
    }
    const row = operation.tie === 'last'
      ? [...ranked].reverse().find(candidate => resolveFieldPath(candidate, operation.by) === resolveFieldPath(ranked[0], operation.by)) ?? ranked[0]
      : ranked[0];
    return [{ row, rank: 1 }];
  },
});

const maxSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal('max'),
    by: z.string().min(1),
    tie: z.enum(['first', 'last', 'all']).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, 'descending');
    if (ranked.length === 0) return [];
    if (operation.tie === 'all') {
      const value = resolveFieldPath(ranked[0], operation.by);
      return ranked.filter(row => resolveFieldPath(row, operation.by) === value).map((row, index) => ({ row, rank: index + 1 }));
    }
    const row = operation.tie === 'last'
      ? [...ranked].reverse().find(candidate => resolveFieldPath(candidate, operation.by) === resolveFieldPath(ranked[0], operation.by)) ?? ranked[0]
      : ranked[0];
    return [{ row, rank: 1 }];
  },
});

const firstSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal('first'),
    orderBy: z.array(z.object({ field: z.string().min(1), order: z.enum(['ascending', 'descending']).optional() })).min(1).optional(),
  }),
  inputFields: operation => operation.orderBy?.map(order => order.field) ?? [],
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return ordered.length === 0 ? [] : [{ row: ordered[0], rank: 1 }];
  },
});

const lastSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal('last'),
    orderBy: z.array(z.object({ field: z.string().min(1), order: z.enum(['ascending', 'descending']).optional() })).min(1).optional(),
  }),
  inputFields: operation => operation.orderBy?.map(order => order.field) ?? [],
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return ordered.length === 0 ? [] : [{ row: ordered[ordered.length - 1], rank: 1 }];
  },
});

const topSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal('top'),
    by: z.string().min(1),
    n: z.number().int().positive(),
    tie: z.enum(['first', 'last', 'all']).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, 'descending');
    const selected = ranked.slice(0, operation.n);
    if (operation.tie === 'all' && selected.length > 0 && ranked.length > selected.length) {
      const threshold = resolveFieldPath(selected[selected.length - 1], operation.by);
      for (const row of ranked.slice(operation.n)) {
        if (resolveFieldPath(row, operation.by) !== threshold) break;
        selected.push(row);
      }
    }
    return selected.map((row, index) => ({ row, rank: index + 1 }));
  },
});

const bottomSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal('bottom'),
    by: z.string().min(1),
    n: z.number().int().positive(),
    tie: z.enum(['first', 'last', 'all']).optional(),
  }),
  inputFields: operation => [operation.by],
  select: (rows, operation) => {
    const ranked = rankedByNumericField(rows, operation.by, 'ascending');
    const selected = ranked.slice(0, operation.n);
    if (operation.tie === 'all' && selected.length > 0 && ranked.length > selected.length) {
      const threshold = resolveFieldPath(selected[selected.length - 1], operation.by);
      for (const row of ranked.slice(operation.n)) {
        if (resolveFieldPath(row, operation.by) !== threshold) break;
        selected.push(row);
      }
    }
    return selected.map((row, index) => ({ row, rank: index + 1 }));
  },
});

const nthSelectorDefinition = defineRowSelector({
  schema: z.object({
    op: z.literal('nth'),
    orderBy: z.array(z.object({ field: z.string().min(1), order: z.enum(['ascending', 'descending']).optional() })).min(1),
    index: z.number().int().nonnegative(),
  }),
  inputFields: operation => operation.orderBy.map(order => order.field),
  select: (rows, operation) => {
    const ordered = orderRows(rows, operation.orderBy);
    return operation.index >= ordered.length ? [] : [{ row: ordered[operation.index], rank: operation.index + 1 }];
  },
});

export const BUILTIN_STAT_REDUCERS: ReadonlyArray<AnyStatReducerDefinition> = [
  countReducerDefinition,
  sumReducerDefinition,
  meanReducerDefinition,
  medianReducerDefinition,
  minReducerDefinition,
  maxReducerDefinition,
  extentReducerDefinition,
  quantileReducerDefinition,
] as ReadonlyArray<AnyStatReducerDefinition>;

export const BUILTIN_ROW_SELECTORS: ReadonlyArray<AnyRowSelectorDefinition> = [
  minSelectorDefinition,
  maxSelectorDefinition,
  firstSelectorDefinition,
  lastSelectorDefinition,
  topSelectorDefinition,
  bottomSelectorDefinition,
  nthSelectorDefinition,
] as ReadonlyArray<AnyRowSelectorDefinition>;

export const resolveStatReducerRegistry = (custom?: ReadonlyArray<AnyStatReducerDefinition>): Map<string, AnyStatReducerDefinition> => {
  const registry = new Map<string, AnyStatReducerDefinition>();
  for (const def of BUILTIN_STAT_REDUCERS) registry.set(extractStatisticOperation(def.schema), def);
  for (const def of custom ?? []) {
    const op = extractStatisticOperation(def.schema);
    if (registry.has(op)) throw new Error(`lowerPlots: duplicate stat reducer registration: "${op}"`);
    registry.set(op, def);
  }
  return registry;
};

export const resolveRowSelectorRegistry = (custom?: ReadonlyArray<AnyRowSelectorDefinition>): Map<string, AnyRowSelectorDefinition> => {
  const registry = new Map<string, AnyRowSelectorDefinition>();
  for (const def of BUILTIN_ROW_SELECTORS) registry.set(extractStatisticOperation(def.schema), def);
  for (const def of custom ?? []) {
    const op = extractStatisticOperation(def.schema);
    if (registry.has(op)) throw new Error(`lowerPlots: duplicate row selector registration: "${op}"`);
    registry.set(op, def);
  }
  return registry;
};

const parseReducerOperation = (definition: AnyStatReducerDefinition, operation: ReducerOperation): never =>
  definition.schema.parse(operation) as never;

const parseSelectorOperation = (definition: AnyRowSelectorDefinition, operation: SelectorOperation): never =>
  definition.schema.parse(operation) as never;

const reducerDefinitionOf = (
  operation: ReducerOperation,
  registry: ReadonlyMap<string, AnyStatReducerDefinition> = resolveStatReducerRegistry(),
): AnyStatReducerDefinition => {
  const definition = registry.get(operation.op);
  if (definition === undefined) {
    throw new Error(`lowerPlots: reducer op "${operation.op}" is not registered; pass a StatReducerDefinition via options.statReducerDefinitions`);
  }
  return definition;
};

const selectorDefinitionOf = (
  operation: SelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): AnyRowSelectorDefinition => {
  const definition = registry.get(operation.op);
  if (definition === undefined) {
    throw new Error(`lowerPlots: selector op "${operation.op}" is not registered; pass a RowSelectorDefinition via options.rowSelectorDefinitions`);
  }
  return definition;
};

export const reducerInputFields = (
  operation: ReducerOperation,
  registry: ReadonlyMap<string, AnyStatReducerDefinition> = resolveStatReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.inputFields?.(parseReducerOperation(definition, operation)) ?? [];
};

export const reducerOutputFields = (
  operation: ReducerOperation,
  registry: ReadonlyMap<string, AnyStatReducerDefinition> = resolveStatReducerRegistry(),
): Array<string> => {
  const definition = reducerDefinitionOf(operation, registry);
  return definition.outputFields?.(parseReducerOperation(definition, operation)) ?? [];
};

export const applyReducerOperation = (
  rows: Array<ExternalRow>,
  operation: ReducerOperation,
  context: StatReducerContext,
): ExternalRow => {
  const registry = context.statReducerRegistry ?? resolveStatReducerRegistry();
  const definition = reducerDefinitionOf(operation, registry);
  return definition.reduce(rows, parseReducerOperation(definition, operation), context);
};

export const selectorInputFields = (
  operation: SelectorOperation,
  registry: ReadonlyMap<string, AnyRowSelectorDefinition> = resolveRowSelectorRegistry(),
): Array<string> => {
  const definition = selectorDefinitionOf(operation, registry);
  return definition.inputFields?.(parseSelectorOperation(definition, operation)) ?? [];
};

export const applySelectorOperation = (
  rows: Array<ExternalRow>,
  operation: SelectorOperation,
  context: Pick<StatReducerContext, 'rowSelectorRegistry'>,
): Array<RowSelection> => {
  const registry = context.rowSelectorRegistry ?? resolveRowSelectorRegistry();
  const definition = selectorDefinitionOf(operation, registry);
  return definition.select(rows, parseSelectorOperation(definition, operation));
};
