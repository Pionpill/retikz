import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputMatrix } from '@retikz/standard-vanilla/collection';
import { MatrixInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { IRMatrix } from '@retikz/standard/collection';
import type { FC, ReactNode } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import type { CellProps } from '../cell';
import { collectCellMarkers, createCellsInput, markerCell } from '../cell';
import { MatrixCell } from './MatrixCell';
import { MatrixRow } from './MatrixRow';
/** Matrix 的 React 输入；省略所有入口时生成空矩阵 */
export type MatrixProps = Omit<IRMatrix, 'namespace' | 'type' | 'items' | 'data' | 'skeleton' | 'dataExpand'> &
  (
    | { items: Array<Array<string | CellProps>>; data?: never; skeleton?: never; children?: never; dataExpand?: never }
    | {
        data: NonNullable<IRMatrix['data']>;
        items?: never;
        skeleton?: never;
        children?: never;
        dataExpand?: IRMatrix['dataExpand'];
      }
    | { skeleton: NonNullable<IRMatrix['skeleton']>; items?: never; data?: never; children?: never; dataExpand?: never }
    | { children?: ReactNode; items?: never; data?: never; skeleton?: never; dataExpand?: never }
  );
/** 收集行格 marker，并将 drawable 交给统一输入适配 */
const createMatrixInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { items, data, skeleton, children, dataExpand, ...input } = props as MatrixProps;
  if (skeleton !== undefined) return { ...input, skeleton } satisfies InputMatrix;
  if (data !== undefined)
    return { ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) } satisfies InputMatrix;
  const rows =
    items ??
    collectCellMarkers(children, MatrixRow, 'Matrix').map(row =>
      collectCellMarkers(row.children, MatrixCell, 'MatrixRow').map(markerCell),
    );
  const collected = createCellsInput(
    rows.flatMap(row => row.map(cell => (typeof cell === 'string' ? { content: cell } : cell))),
    context,
  );
  let cursor = 0;
  const result: InputMatrix = {
    ...input,
    items: rows.map(row =>
      row.map(cell => {
        const value = collected.cells[cursor++];
        return typeof cell === 'string' ? cell : value;
      }),
    ),
  };
  return withInputEmbedAdapters(result, collected.adapters);
};
const MatrixComponent: FC<MatrixProps> = () => null;
/** Standard Matrix 呈现组件 */
export const Matrix = MatrixComponent as StandardEmbeddableComponent<MatrixProps>;
Matrix.displayName = 'Matrix';
Matrix.isTier2Embeddable = true;
Matrix.inputEmbedAdapter = MatrixInputEmbedAdapter;
Matrix.createInputEmbedProps = createMatrixInput;
