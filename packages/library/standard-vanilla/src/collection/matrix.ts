import { PathClipProvider } from '@retikz/extension';
import type { IRMatrix } from '@retikz/standard/collection';
import { createMatrix, MatrixProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { StandardMatrixEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/** Matrix 的三种互斥 Vanilla 输入；items 接受嵌套 drawable */
export type InputMatrix = Omit<IRMatrix, 'namespace' | 'type' | 'items' | 'data' | 'skeleton' | 'dataExpand'> &
  (
    | {
        /** 按行排列的二维单元格，与数据和骨架入口互斥 */
        items: Array<Array<string | InputCell>>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** 用于展开矩阵的二维数据，与其它内容入口互斥 */
        data: NonNullable<IRMatrix['data']>;
        items?: never;
        skeleton?: never;
        /** 仅用于数据入口的展开策略 */
        dataExpand?: IRMatrix['dataExpand'];
      }
    | {
        /** 用于构造空矩阵的行列结构，与其它内容入口互斥 */
        skeleton: NonNullable<IRMatrix['skeleton']>;
        items?: never;
        data?: never;
        dataExpand?: never;
      }
  );

/** 收集矩阵及格内 drawable 的依赖 */
export const MatrixInputEmbedAdapter: SynchronousInputEmbedAdapter<InputMatrix> = {
  kind: StandardMatrixEmbedKind,
  lower: (props, context) => {
    if (props.skeleton !== undefined)
      return {
        node: createMatrix({ namespace: 'standard', type: 'matrix', ...props }),
        providerDependencies: { roots: [MatrixProvider.key], providers: [MatrixProvider, PathClipProvider] },
      };

    if (props.data !== undefined)
      return {
        node: createMatrix({ namespace: 'standard', type: 'matrix', ...props }),
        providerDependencies: {
          roots: [MatrixProvider.key, ...dataCellDependencies.roots],
          providers: [MatrixProvider, ...dataCellDependencies.providers],
        },
      };

    const { items, ...input } = props;
    const normalized = normalizeCells(
      items.flatMap(row => row.map(cell => (typeof cell === 'string' ? { content: cell } : cell))),
      context,
      MatrixProvider,
    );
    let cursor = 0;

    return {
      node: createMatrix({
        namespace: 'standard',
        type: 'matrix',
        ...input,
        items: items.map(row =>
          row.map(cell => {
            const value = normalized.cells[cursor++];
            return typeof cell === 'string' ? cell : value;
          }),
        ),
      }),
      providerDependencies: normalized.providerDependencies,
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建保留原始输入的 Matrix embed */
export const matrix = (input: InputMatrix): InputEmbed<InputMatrix> => ({
  type: 'embed',
  kind: StandardMatrixEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
