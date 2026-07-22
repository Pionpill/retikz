import type { IRChild, IRScope } from '@retikz/core';

import type { PresentedTableModel } from '../../contract';
import type { TableLayout } from '../layout';

import { emitTableBoundsSentinel, emitTableCell } from './emit';

const alignmentError = (detail: string): never => {
  throw new Error(`table: internal cell alignment: ${detail}`);
};

/** 校验 layout 的 track identity 与 canonical model 一致 */
const assertTrackAlignment = (presented: PresentedTableModel, layout: TableLayout): void => {
  if (presented.semantic.rows.length !== layout.rows.length) alignmentError('row count differs');
  if (presented.semantic.columns.length !== layout.columns.length) alignmentError('column count differs');
  presented.semantic.rows.forEach((row, index) => {
    const track = layout.rows.at(index);
    if (track === undefined || track.id !== row.id || track.index !== index) alignmentError(`row ${index} differs`);
  });
  presented.semantic.columns.forEach((column, index) => {
    const track = layout.columns.at(index);
    if (track === undefined || track.id !== column.id || track.index !== index) {
      alignmentError(`column ${index} differs`);
    }
  });
};

/** 把 PresentedTableModel 与 TableLayout 配对并输出 local namespace Core Scope */
export const emitTable = (presented: PresentedTableModel, layout: TableLayout): IRChild => {
  assertTrackAlignment(presented, layout);
  if (presented.semantic.cells.length !== presented.cells.length) alignmentError('presented Cell count differs');
  if (presented.semantic.cells.length !== layout.cells.length) alignmentError('layout Cell count differs');

  const cells: Array<IRScope> = presented.semantic.cells.map((semantic, index) => {
    const content = presented.cells.at(index);
    const geometry = layout.cells.at(index);
    if (content === undefined || geometry === undefined) return alignmentError(`Cell ${index} is missing`);
    if (content.cellId !== semantic.id || geometry.cellId !== semantic.id)
      alignmentError(`Cell ${index} identity differs`);
    return emitTableCell(semantic, content, geometry);
  });

  return {
    type: 'scope',
    localNamespace: true,
    children: [emitTableBoundsSentinel(layout), ...cells],
  };
};
