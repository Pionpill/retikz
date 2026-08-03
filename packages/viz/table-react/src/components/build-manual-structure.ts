import type { IRDataScalarValue } from '@retikz/data';
import type { IRManualTableCell, ManualTableSpecInput, TableRowKindValue } from '@retikz/table';
import type { ReactElement, ReactNode } from 'react';

import { ScalarValueSchema } from '@retikz/data';
import { TableRowKind } from '@retikz/table';
import { isValidElement } from 'react';

import type { CellProps } from './cell';
import type { RowProps } from './row';

import { Cell } from './cell';
import { visitTableChildren } from './child-traversal';
import { Row } from './row';

/** ManualTable children 收集后交给 plain constructor 的矩形结构输入 */
export type ManualStructureInput = Pick<ManualTableSpecInput, 'rows' | 'rowKinds'>;

/** 判断节点是否为 Row marker */
const isRowElement = (child: ReactNode): child is ReactElement<RowProps, typeof Row> =>
  isValidElement(child) && child.type === Row;

/** 判断节点是否为 Cell marker */
const isCellElement = (child: ReactNode): child is ReactElement<CellProps, typeof Cell> =>
  isValidElement(child) && child.type === Cell;

/** 解析 Cell 的单一标量 payload 来源 */
const parseScalarValue = (value: unknown, row: number, column: number): IRDataScalarValue => {
  try {
    return ScalarValueSchema.parse(value);
  } catch {
    throw new Error(`table react: Cell at row ${row}, column ${column} value must be a JSON scalar`);
  }
};

/** 把单个 Cell marker 转成 addressless manual Table Cell */
const buildCell = (element: ReactElement<CellProps, typeof Cell>, row: number, column: number): IRManualTableCell => {
  const { children, value, content, formatter, presentation, ...fields } = element.props;
  const hasChildren = Object.hasOwn(element.props, 'children');
  const hasValue = Object.hasOwn(element.props, 'value');
  const hasContent = Object.hasOwn(element.props, 'content');
  if (Number(hasChildren) + Number(hasValue) + Number(hasContent) !== 1) {
    throw new Error(`table react: Cell at row ${row}, column ${column} requires exactly one payload source`);
  }
  if (hasContent) {
    if (formatter !== undefined) {
      throw new Error(`table react: Cell at row ${row}, column ${column} content cannot be combined with formatter`);
    }
    if (presentation !== undefined) {
      throw new Error(`table react: Cell at row ${row}, column ${column} content cannot be combined with presentation`);
    }
    if (content === undefined) {
      throw new Error(`table react: Cell at row ${row}, column ${column} content must be an IRChild`);
    }
    return {
      ...fields,
      content,
    };
  }
  const scalar = parseScalarValue(hasValue ? value : children, row, column);
  return {
    ...fields,
    value: scalar,
    ...(formatter === undefined ? {} : { formatter }),
    ...(presentation === undefined ? {} : { presentation }),
  };
};

/** 从 Row 与 Cell marker children 构造 manual Table 的矩形 rows */
export const buildManualStructure = (children: ReactNode): ManualStructureInput => {
  const rowElements: Array<ReactElement<RowProps, typeof Row>> = [];
  visitTableChildren(children, child => {
    if (!isRowElement(child)) {
      throw new Error('table react: ManualTable children only accept Row');
    }
    rowElements.push(child);
  });
  if (rowElements.length === 0) throw new Error('table react: ManualTable children require at least one Row');

  const hasExplicitRowKind = rowElements.some(rowElement => rowElement.props.kind !== undefined);
  const rowKinds: Array<TableRowKindValue> = rowElements.map(rowElement => rowElement.props.kind ?? TableRowKind.Body);
  const occupancy = Array.from({ length: rowElements.length }, () => [] as Array<boolean>);
  const entries: Array<{ row: number; column: number; cell: IRManualTableCell }> = [];
  let columnCount = 0;
  rowElements.forEach((rowElement, rowIndex) => {
    const { children: rowChildren } = rowElement.props;

    const rowCells: Array<ReactElement<CellProps, typeof Cell>> = [];
    visitTableChildren(rowChildren, child => {
      if (!isCellElement(child)) {
        throw new Error('table react: Row children only accept Cell');
      }
      rowCells.push(child);
    });
    rowCells.forEach(cell => {
      let columnIndex = 0;
      while (occupancy[rowIndex][columnIndex]) columnIndex += 1;
      const rowSpan = cell.props.span?.rows ?? 1;
      const columnSpan = cell.props.span?.columns ?? 1;
      if (!Number.isInteger(rowSpan) || rowSpan <= 0 || !Number.isInteger(columnSpan) || columnSpan <= 0) {
        throw new Error(`table react: Cell at row ${rowIndex}, column ${columnIndex} span must be positive integers`);
      }
      if (rowIndex + rowSpan > rowElements.length) {
        throw new Error(`table react: Cell at row ${rowIndex}, column ${columnIndex} span is out of bounds`);
      }
      for (let occupiedRow = rowIndex; occupiedRow < rowIndex + rowSpan; occupiedRow += 1) {
        if (rowKinds[occupiedRow] !== rowKinds[rowIndex]) {
          throw new Error(`table react: Cell at row ${rowIndex}, column ${columnIndex} span crosses row kind`);
        }
        for (let occupiedColumn = columnIndex; occupiedColumn < columnIndex + columnSpan; occupiedColumn += 1) {
          if (occupancy[occupiedRow][occupiedColumn]) {
            throw new Error(
              `table react: Cell at row ${rowIndex}, column ${columnIndex} span overlaps an occupied slot`,
            );
          }
        }
      }
      for (let occupiedRow = rowIndex; occupiedRow < rowIndex + rowSpan; occupiedRow += 1) {
        for (let occupiedColumn = columnIndex; occupiedColumn < columnIndex + columnSpan; occupiedColumn += 1) {
          occupancy[occupiedRow][occupiedColumn] = true;
        }
      }
      entries.push({ row: rowIndex, column: columnIndex, cell: buildCell(cell, rowIndex, columnIndex) });
      columnCount = Math.max(columnCount, columnIndex + columnSpan);
    });
  });

  if (entries.length === 0) {
    throw new Error('table react: ManualTable Row children require at least one Cell to infer column count');
  }
  const rows = Array.from({ length: rowElements.length }, () =>
    Array.from<IRManualTableCell | null>({ length: columnCount }).fill(null),
  );
  for (const entry of entries) rows[entry.row][entry.column] = entry.cell;

  return {
    rows,
    ...(hasExplicitRowKind ? { rowKinds } : {}),
  };
};
