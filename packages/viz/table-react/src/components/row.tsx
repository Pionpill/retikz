import type { TableRowKindValue } from '@retikz/table';
import type { FC, ReactNode } from 'react';

/** ManualTable 行声明 marker 的 props */
export type RowProps = {
  /** 可选的行语义类型 */
  kind?: TableRowKindValue;
  /** 按声明顺序排列的 Cell markers */
  children?: ReactNode;
};

/** 声明 ManualTable 的单行 */
export const Row: FC<RowProps> = () => null;
