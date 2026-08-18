import type { IRNode } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import { resolveFieldPath } from '@retikz/data';

import type {
  FacetDimension,
  FacetDimensionItem,
  FacetGrid,
  FacetHeaderLabelStyle,
  FacetLabelDimension,
  FacetPanel,
  FacetPanelValue,
  FacetScalar,
  FacetTuple,
} from './types';

import { slug } from '../../contract';
import { RetikzPlotError } from '../../error';
import { FacetEmptyPolicy } from '../../schemas';

/** 判断 facet header 是否启用 */
export const isFacetHeaderVisible = (facet: FacetGrid, dimension: FacetLabelDimension): boolean => {
  const header = facet.header?.[dimension];
  return header !== undefined && header !== false;
};

/** 读取 facet header 的显式 label 样式 */
export const facetHeaderLabelStyleOf = (
  facet: FacetGrid,
  dimension: FacetLabelDimension,
): FacetHeaderLabelStyle | undefined => {
  const header = facet.header?.[dimension];
  return header && typeof header === 'object' ? header : undefined;
};

/** 解析 facet header label 的旋转角 */
export const facetHeaderLabelRotateOf = (facet: FacetGrid, dimension: FacetLabelDimension): number | undefined => {
  const style = facetHeaderLabelStyleOf(facet, dimension);
  if (style?.rotate !== undefined) return style.rotate;
  return dimension === 'row' ? -90 : undefined;
};

const isFacetScalar = (value: unknown): value is FacetScalar =>
  value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const facetValueOf = (row: ExternalRow, field: string): FacetScalar => {
  const value = resolveFieldPath(row, field);
  if (value === undefined) throw new RetikzPlotError(`lowerPlots: facet field "${field}" is missing on a row`);
  if (!isFacetScalar(value)) {
    throw new RetikzPlotError(
      `lowerPlots: facet field "${field}" must resolve to a JSON scalar (string, number, boolean, or null)`,
    );
  }
  return value;
};

/** 把单层或多层 facet 声明归一化为数组 */
export const facetDimensionsOf = (dimension: FacetDimension | undefined): Array<FacetDimensionItem> => {
  if (dimension === undefined) return [];
  return Array.isArray(dimension) ? dimension : [dimension];
};

const facetTupleOf = (row: ExternalRow, dimension: FacetDimension | undefined): FacetTuple | undefined => {
  const dimensions = facetDimensionsOf(dimension);
  if (dimensions.length === 0) return undefined;
  return dimensions.map(item => facetValueOf(row, item.field));
};

const facetPanelValueOf = (tuple: FacetTuple | undefined): FacetPanelValue => {
  if (tuple === undefined) return undefined;
  return tuple.length === 1 ? tuple[0] : tuple;
};

const facetPanelTupleOf = (value: FacetPanelValue): FacetTuple => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const facetValueKey = (value: FacetTuple | undefined): string => (value === undefined ? '' : JSON.stringify(value));

const orderedFacetValues = (dimension: FacetDimensionItem, rows: ReadonlyArray<ExternalRow>): Array<FacetScalar> => {
  const out: Array<FacetScalar> = [];
  const seen = new Set<string>();
  const add = (value: FacetScalar): void => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  };
  for (const value of dimension.order ?? []) add(value);
  for (const row of rows) add(facetValueOf(row, dimension.field));
  return out;
};

const cartesianFacetTuples = (valuesByDimension: ReadonlyArray<ReadonlyArray<FacetScalar>>): Array<FacetTuple> =>
  valuesByDimension.reduce<Array<FacetTuple>>(
    (tuples, values) => tuples.flatMap(tuple => values.map(value => [...tuple, value])),
    [[]],
  );

const orderedFacetTuples = (
  dimension: FacetDimension | undefined,
  rows: ReadonlyArray<ExternalRow>,
): Array<FacetTuple | undefined> => {
  const dimensions = facetDimensionsOf(dimension);
  if (dimensions.length === 0) return [undefined];
  return cartesianFacetTuples(dimensions.map(item => orderedFacetValues(item, rows)));
};

const slugFacetValue = (value: FacetTuple | undefined): string =>
  value === undefined ? '' : value.map(item => slug(item)).join('.');

const defaultFacetPanelId = (facet: FacetGrid, row: FacetTuple | undefined, column: FacetTuple | undefined): string => {
  const rowKey = row === undefined ? '_' : slugFacetValue(row);
  const columnKey = column === undefined ? '_' : slugFacetValue(column);
  return `${facet.id}.panel.${rowKey}.${columnKey}`;
};

const facetPanelId = (facet: FacetGrid, row: FacetTuple | undefined, column: FacetTuple | undefined): string => {
  const panel = defaultFacetPanelId(facet, row, column);
  const template = facet.viewIdTemplate;
  if (template === undefined) return panel;
  return template
    .replaceAll('{arrangement}', facet.id)
    .replaceAll('{row}', slugFacetValue(row))
    .replaceAll('{column}', slugFacetValue(column))
    .replaceAll('{panel}', panel);
};

/** 按 facet 维度、顺序与 empty 策略生成 panel。 */
export const resolveFacetPanels = (
  facet: FacetGrid,
  rows: ReadonlyArray<ExternalRow>,
  usedIds: Set<string>,
): Array<FacetPanel> => {
  const rowValues = orderedFacetTuples(facet.row, rows);
  const columnValues = orderedFacetTuples(facet.column, rows);
  const groups = new Map<string, Array<ExternalRow>>();
  for (const row of rows) {
    const rowValue = facetTupleOf(row, facet.row);
    const columnValue = facetTupleOf(row, facet.column);
    const key = `${facetValueKey(rowValue)}\u0000${facetValueKey(columnValue)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const panels: Array<FacetPanel> = [];
  for (const [rowIndex, rowValue] of rowValues.entries()) {
    for (const [columnIndex, columnValue] of columnValues.entries()) {
      const key = `${facetValueKey(rowValue)}\u0000${facetValueKey(columnValue)}`;
      const panelRows = groups.get(key) ?? [];
      if (panelRows.length === 0 && facet.empty !== FacetEmptyPolicy.Show) continue;
      const id = facetPanelId(facet, rowValue, columnValue);
      if (usedIds.has(id)) throw new RetikzPlotError(`lowerPlots: facet panel view id "${id}" is duplicated`);
      usedIds.add(id);
      panels.push({
        id,
        facet,
        row: facetPanelValueOf(rowValue),
        column: facetPanelValueOf(columnValue),
        rowIndex,
        columnIndex,
        rows: panelRows,
      });
    }
  }
  return panels;
};

const orderedFacetPanelValuesByIndex = (
  panels: ReadonlyArray<FacetPanel>,
  dimension: FacetLabelDimension,
): Array<{ index: number; tuple: FacetTuple }> => {
  const values = new Map<number, FacetTuple>();
  for (const panel of panels) {
    const index = dimension === 'column' ? panel.columnIndex : panel.rowIndex;
    if (values.has(index)) continue;
    values.set(index, facetPanelTupleOf(dimension === 'column' ? panel.column : panel.row));
  }
  return [...values.entries()].sort(([a], [b]) => a - b).map(([index, tuple]) => ({ index, tuple }));
};

const facetLabelGroupKey = (tuple: FacetTuple, level: number): string => JSON.stringify(tuple.slice(0, level + 1));

/** 把连续且同前缀的 facet 值归并为 header label span。 */
export const buildFacetLabelGroups = (
  panels: ReadonlyArray<FacetPanel>,
  dimension: FacetLabelDimension,
  level: number,
): Array<{ startIndex: number; span: number; value: FacetScalar }> => {
  const values = orderedFacetPanelValuesByIndex(panels, dimension).filter(({ tuple }) => tuple.length > level);
  const groups: Array<{ startIndex: number; endIndex: number; key: string; value: FacetScalar }> = [];
  for (const { index, tuple } of values) {
    const key = facetLabelGroupKey(tuple, level);
    const value = tuple[level];
    const last = groups.at(-1);
    if (last !== undefined && last.key === key && index === last.endIndex + 1) {
      last.endIndex = index;
      continue;
    }
    groups.push({ startIndex: index, endIndex: index, key, value });
  }
  return groups.map(group => ({
    startIndex: group.startIndex,
    span: group.endIndex - group.startIndex + 1,
    value: group.value,
  }));
};

const facetDimensionItemOf = (
  facet: FacetGrid,
  dimension: FacetLabelDimension,
  level: number,
): FacetDimensionItem | undefined => {
  const dimensions = facetDimensionsOf(dimension === 'column' ? facet.column : facet.row);
  return dimensions[level];
};

/** 解析 facet header label 文本。 */
export const facetLabelTextOf = (
  facet: FacetGrid,
  dimension: FacetLabelDimension,
  level: number,
  value: FacetScalar,
): IRNode['text'] => {
  const item = facetDimensionItemOf(facet, dimension, level);
  const label = item?.labels?.find(candidate => JSON.stringify(candidate.value) === JSON.stringify(value));
  return label?.label ?? String(value);
};
