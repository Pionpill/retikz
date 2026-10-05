import type { ReactInputEmbedContext } from '@retikz/react';
import { withInputEmbedAdapters } from '@retikz/react';
import type { InputChain, InputChainItem } from '@retikz/standard-vanilla/collection';
import { ChainInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { FC, ReactNode, ReactElement } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';
import { collectCellMarkers, createCellsInput, markerCell, invalidCellAuthoring } from '../cell';
import type { DrawableCell } from '../cell';
import { ChainBranch } from './ChainBranch';
import { ChainCell } from './ChainCell';
import type { ChainCellProps } from './ChainCell';
import { ChainParallel } from './ChainParallel';
import type { ChainParallelProps } from './ChainParallel';

/** 属性 items 不接受 React drawable，复杂内容使用 children */
export type ChainItemProps =
  | string
  | (Omit<Extract<InputChainItem, { kind: 'cell' }>, 'content'> & { content?: string })
  | (Omit<Extract<InputChainItem, { kind: 'parallel' }>, 'branches'> & {
      branches: Array<{ items: Array<ChainItemProps> }>;
    });

/** Chain 的属性入口与 JSX 入口互斥 */
export type ChainProps = Omit<InputChain, 'items' | 'data' | 'skeleton' | 'dataExpand'> &
  (
    | { items: Array<ChainItemProps>; data?: never; skeleton?: never; children?: never; dataExpand?: never }
    | {
        data: NonNullable<InputChain['data']>;
        items?: never;
        skeleton?: never;
        children?: never;
        dataExpand?: InputChain['dataExpand'];
      }
    | {
        skeleton: NonNullable<InputChain['skeleton']>;
        items?: never;
        data?: never;
        children?: never;
        dataExpand?: never;
      }
    | { children?: ReactNode; items?: never; data?: never; skeleton?: never; dataExpand?: never }
  );

/** 展开结构 marker，先统一收集内容以保证 occurrence 唯一 */
const createChainInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, items, data, skeleton, dataExpand, ...rest } = props as ChainProps;
  if (skeleton !== undefined) return { ...rest, skeleton } satisfies InputChain;
  if (data !== undefined)
    return { ...rest, data, ...(dataExpand === undefined ? {} : { dataExpand }) } satisfies InputChain;
  if (items !== undefined) return { ...rest, items } satisfies InputChain;

  const input = rest;
  const cells: Array<DrawableCell> = [];

  const collect = (nodes: ReactNode): Array<InputChainItem> => {
    const result: Array<InputChainItem> = [];
    Children.forEach(nodes, child => {
      if (child === null || child === undefined || typeof child === 'boolean') return;
      if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
        result.push(...collect(child.props.children));
        return;
      }

      if (isValidElement(child) && child.type === ChainCell) {
        cells.push(markerCell((child as ReactElement<ChainCellProps>).props));
        result.push({ kind: 'cell' });
        return;
      }

      if (isValidElement(child) && child.type === ChainParallel) {
        const { children: branchNodes, ...block } = (child as ReactElement<ChainParallelProps>).props;
        result.push({
          kind: 'parallel',
          ...block,
          branches: collectCellMarkers(branchNodes, ChainBranch, 'ChainParallel').map(branch => ({
            items: collect(branch.children),
          })),
        });

        return;
      }

      invalidCellAuthoring('Chain and ChainBranch accept only ChainCell or ChainParallel.');
    });

    return result;
  };

  const structure = collect(children);
  const collected = createCellsInput(cells, context);
  let cursor = 0;
  const populate = (sequence: Array<InputChainItem>): Array<InputChainItem> =>
    sequence.map(item =>
      typeof item === 'string'
        ? item
        : item.kind === 'cell'
          ? { kind: 'cell', ...collected.cells[cursor++] }
          : { ...item, branches: item.branches.map(branch => ({ items: populate(branch.items) })) },
    );

  return withInputEmbedAdapters({ ...input, items: populate(structure) } satisfies InputChain, collected.adapters);
};

const ChainComponent: FC<ChainProps> = () => null;

/** 串并联内容容器 */
export const Chain = ChainComponent as StandardEmbeddableComponent<ChainProps>;
Chain.displayName = 'Chain';
Chain.isTier2Embeddable = true;
Chain.inputEmbedAdapter = ChainInputEmbedAdapter;
Chain.createInputEmbedProps = createChainInput;
