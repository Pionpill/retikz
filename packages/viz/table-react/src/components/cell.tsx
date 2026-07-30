import type { IRChild } from '@retikz/core';
import type { IRDataScalarValue } from '@retikz/data';
import type { IRManualTableCell, IRTablePresentationRef } from '@retikz/table';
import type { FC } from 'react';

type ManualTableCellObject = Extract<IRManualTableCell, object>;
type CellSharedProps = Omit<ManualTableCellObject, 'value' | 'content' | 'presentation'>;

type CellValueProps = {
  /** 作为 value payload 写入的 JSON 标量 */
  value: IRDataScalarValue;
  /** value payload 使用的可选 Cell presentation */
  presentation?: IRTablePresentationRef;
  /** value payload 不接受 content */
  content?: never;
  /** value payload 不接受 children */
  children?: never;
};

type CellContentProps = {
  /** 作为 content payload 写入的合法 Core IRChild */
  content: IRChild;
  /** content payload 不接受 value */
  value?: never;
  /** content payload 不接受 presentation */
  presentation?: never;
  /** content payload 不接受 children */
  children?: never;
};

type CellChildrenProps = {
  /** 作为 value payload 写入的 JSON 标量 children */
  children: IRDataScalarValue;
  /** children value payload 使用的可选 Cell presentation */
  presentation?: IRTablePresentationRef;
  /** children value payload 不接受 value */
  value?: never;
  /** children value payload 不接受 content */
  content?: never;
};

/** ManualTable Cell 声明 marker 的 props */
export type CellProps = CellSharedProps & (CellValueProps | CellContentProps | CellChildrenProps);

/** 声明 ManualTable 的单个 Cell */
export const Cell: FC<CellProps> = () => null;
