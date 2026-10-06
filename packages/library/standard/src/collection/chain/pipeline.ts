import type { IRPath, IRStep, LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import { cellReferenceNode, compileCells, measureCell } from '../_cell';
import type { CellPlacement } from '../_cell';
import { layoutChainItems } from './layout';
import { resolveChain } from './resolve';
import type { CanonicalChainItem } from './resolve';
import type { IRChain } from './schema';
import type { MeasuredChainItem } from './types';

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

  // 测量保持深度优先 occurrence 顺序，不在此阶段放置或生成路径
  const measureItems = (items: Array<CanonicalChainItem>): Array<MeasuredChainItem> =>
    items.map(item =>
      item.kind === 'cell'
        ? { kind: 'cell', measured: measureCell(item.cell, context, occurrence++, scope) }
        : { ...item, branches: item.branches.map(measureItems) },
    );
  const measured = measureItems(resolved.items);
  const block = layoutChainItems(measured, resolved.layout, resolved.connection, down);

  // 只在布局完成后转回绘图坐标，引用节点与内容共享同一分配边界
  const targets = new Map(block.cells.map((cell, index) => [cell, { id: `cell-${index}` }]));
  const cells: Array<CellPlacement> = block.cells.map(cell => ({
    measured: cell.measured,
    x: down ? cell.y : cell.x,
    y: down ? cell.x : cell.y,
    width: down ? cell.height : cell.width,
    height: down ? cell.width : cell.height,
    role: 'chain-cell',
  }));
  const referenceNodes = cells.map((cell, index) => cellReferenceNode(`cell-${index}`, cell));
  const paths: Array<IRPath> = block.connections.map(({ from, to, options, autoFraction }) => {
    const route =
      options.route === 'auto' ? (autoFraction === undefined ? 'straight' : down ? '|-|' : '-|-') : options.route;
    const fraction = options.route === 'auto' ? autoFraction : options.fraction;
    const target = targets.get(to)!;
    const step: IRStep =
      route === 'straight'
        ? { type: 'step', kind: 'line', to: target }
        : route === '-|-' || route === '|-|'
          ? { type: 'step', kind: 'fold', via: route, ...(fraction === undefined ? {} : { fraction }), to: target }
          : { type: 'step', kind: 'fold', via: route, to: target };
    return { ...options.path, type: 'path', children: [{ type: 'step', kind: 'move', to: targets.get(from)! }, step] };
  });

  return compileCells(
    cells,
    {
      width: down ? block.height : block.width,
      height: down ? block.width : block.height,
      scope,
      decoration: { style, label },
      extra: [context.scope({ localNamespace: true, defaults: { reset: ['node'] } }, [...referenceNodes, ...paths])],
    },
    context,
  );
};
