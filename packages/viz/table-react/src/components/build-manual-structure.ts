import type { IRDataScalarValue } from '@retikz/data';
import type { IRTableCell, ManualTableSpecInput, TableRowKindValue } from '@retikz/table';
import type { ReactElement, ReactNode } from 'react';

import { ScalarValueSchema } from '@retikz/data';
import { TableCellPayloadKind, TableRowKind } from '@retikz/table';
import { isValidElement } from 'react';

import type { CellProps } from './cell';
import type { RowProps } from './row';

import { Cell } from './cell';
import { visitTableChildren } from './child-traversal';
import { Row } from './row';

/** ManualTable children 收集后交给现有 plain constructor 的结构输入 */
export type ManualStructureInput = Pick<ManualTableSpecInput, 'cells' | 'rowKinds'>;

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

/** 把单个 Cell marker 转成带显式地址的 Table Cell */
const buildCell = (element: ReactElement<CellProps, typeof Cell>, row: number, column: number): IRTableCell => {
  const { children, value, content, presentation, ...fields } = element.props;
  const hasChildren = Object.hasOwn(element.props, 'children');
  const hasValue = Object.hasOwn(element.props, 'value');
  const hasContent = Object.hasOwn(element.props, 'content');
  if (Number(hasChildren) + Number(hasValue) + Number(hasContent) !== 1) {
    throw new Error(`table react: Cell at row ${row}, column ${column} requires exactly one payload source`);
  }
  if (hasContent) {
    if (presentation !== undefined) {
      throw new Error(`table react: Cell at row ${row}, column ${column} content cannot be combined with presentation`);
    }
    if (content === undefined) {
      throw new Error(`table react: Cell at row ${row}, column ${column} content must be an IRChild`);
    }
    return {
      ...fields,
      address: { row, column },
      payload: { kind: TableCellPayloadKind.Content, content },
    };
  }
  const scalar = parseScalarValue(hasValue ? value : children, row, column);
  return {
    ...fields,
    address: { row, column },
    payload: {
      kind: TableCellPayloadKind.Value,
      value: scalar,
      ...(presentation === undefined ? {} : { presentation }),
    },
  };
};

/** 从 Row 与 Cell marker children 构造 manual Table 的显式结构 */
export const buildManualStructure = (children: ReactNode, rows: number, columns: number): ManualStructureInput => {
  const rowElements: Array<ReactElement<RowProps, typeof Row>> = [];
  visitTableChildren(children, child => {
    if (!isRowElement(child)) {
      throw new Error('table react: ManualTable children only accept Row');
    }
    rowElements.push(child);
  });
  if (rowElements.length !== rows) {
    throw new Error(`table react: ManualTable rows expected ${rows}, received ${rowElements.length}`);
  }

  const hasExplicitRowKind = rowElements.some(rowElement => rowElement.props.kind !== undefined);
  const rowKinds: Array<TableRowKindValue> = rowElements.map(rowElement => rowElement.props.kind ?? TableRowKind.Body);
  const occupancy = Array.from({ length: rows }, () => Array.from<boolean>({ length: columns }).fill(false));
  const cells: Array<IRTableCell> = [];
  rowElements.forEach((rowElement, rowIndex) => {
    const { children: rowChildren } = rowElement.props;

    const rowCells: Array<ReactElement<CellProps, typeof Cell>> = [];
    visitTableChildren(rowChildren, child => {
      if (!isCellElement(child)) {
        throw new Error('table react: Row children only accept Cell');
      }
      rowCells.push(child);
    });
    if (rowCells.length > columns) {
      throw new Error(`table react: Row ${rowIndex} received ${rowCells.length} Cell children, columns is ${columns}`);
    }
    rowCells.forEach(cell => {
      const columnIndex = occupancy[rowIndex].findIndex(occupied => !occupied);
      if (columnIndex < 0) {
        throw new Error(`table react: Row ${rowIndex} has no unoccupied Cell slot`);
      }
      const rowSpan = cell.props.span?.rows ?? 1;
      const columnSpan = cell.props.span?.columns ?? 1;
      if (rowIndex + rowSpan > rows || columnIndex + columnSpan > columns) {
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
      cells.push(buildCell(cell, rowIndex, columnIndex));
    });
  });

  return {
    cells,
    ...(hasExplicitRowKind ? { rowKinds } : {}),
  };
};
