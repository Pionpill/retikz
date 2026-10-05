import type { IRPath, IRStep, LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import { compileCells, measureCell } from '../_cell';
import { layoutChainParallel, layoutChainSequence } from './layout';
import type { ChainBlock } from './layout';
import { resolveChain } from './resolve';
import type { CanonicalChainItem } from './resolve';
import type { IRChain } from './schema';

/** 测量内容后排布串并联结构，连接仍由 Core Path 编译 */
export const compileChain = (source: IRChain, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const resolved = resolveChain(source);
  const {
    items: _items,
    data: _data,
    skeleton: _skeleton,
    dataExpand: _expand,
    layout: _layout,
    connection: _connection,
    namespace: _namespace,
    type: _type,
    style,
    label,
    ...scope
  } = source;
  void _items;
  void _data;
  void _skeleton;
  void _expand;
  void _layout;
  void _connection;
  void _namespace;
  void _type;
  const down = resolved.direction === 'down';
  let occurrence = 0;

  const build = (items: Array<CanonicalChainItem>): Array<ChainBlock> => {
    const blocks: Array<ChainBlock> = [];

    for (const item of items) {
      if (item.kind === 'cell') {
        const measured = measureCell(item.cell, context, occurrence++, scope);
        const cell = {
          measured,
          x: 0,
          y: 0,
          width: down ? measured.height : measured.width,
          height: down ? measured.width : measured.height,
        };
        blocks.push({
          width: cell.width,
          height: cell.height,
          baseline: cell.height / 2,
          cells: [cell],
          edges: [],
          entries: [cell],
          exits: [cell],
        });
      } else
        blocks.push(
          layoutChainParallel(
            item.branches.map(branch => build(branch)),
            item.layout,
            item.connection,
            blocks.at(-1)!.height,
          ),
        );
    }

    return blocks;
  };

  const block = layoutChainSequence(build(resolved.items), resolved.layout, resolved.connection);
  const position = ([x, y]: [number, number]): [number, number] => (down ? [y, x] : [x, y]);
  const paths: Array<IRPath> = block.edges.map(edge => {
    const points = edge.points.map(position);
    const children: Array<IRStep> = [{ type: 'step', kind: 'move', to: points[0] }];

    for (let i = 1; i < points.length; i++)
      children.push(
        edge.connection.route === '|-' || edge.connection.route === '-|'
          ? { type: 'step', kind: 'fold', via: edge.connection.route, to: points[i] }
          : { type: 'step', kind: 'line', to: points[i] },
      );

    return { ...edge.connection.path, type: 'path', children };
  });

  return compileCells(
    block.cells.map(cell => ({
      measured: cell.measured,
      x: down ? cell.y : cell.x,
      y: down ? cell.x : cell.y,
      width: cell.measured.width,
      height: cell.measured.height,
      role: 'chain-cell',
    })),
    {
      width: down ? block.height : block.width,
      height: down ? block.width : block.height,
      scope,
      decoration: { style, label },
      extra: [context.scope({}, paths)],
    },
    context,
  );
};
