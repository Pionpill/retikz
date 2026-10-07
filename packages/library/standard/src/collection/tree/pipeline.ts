import type {
  IRChild,
  IRPath,
  IRStep,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';
import { intrinsicLayoutProposal, requiredLayoutProbe, resolveLayoutAxisSize } from '@retikz/layout/compose';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../shared/errors';
import { resolveTree } from './resolve';
import type { CanonicalTreeItem } from './resolve';
import type { IRTree } from './schema';

/** 测量后的节点与所属子树包络 */
type MeasuredTreeItem = {
  item: CanonicalTreeItem | null;
  result: LayoutChildResult;
  children: Array<MeasuredTreeItem>;
  depth: number;
  /** 指向实际节点的引用，匿名节点仅在内部命名空间可见 */
  targetId: string;
  span: number;
  /** 当前节点中心在子树包络内的交叉轴位置 */
  cross: number;
  /** 直属子树整体在当前包络内的起点 */
  childStart: number;
  x: number;
  y: number;
};

/** 自然测量后组合有序子树，连接复用真实形状的 Core 引用 */
export const compileTree = (source: IRTree, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const { root, emptyNode, scope, label, layout } = resolveTree(source);
  const horizontal = layout.direction === 'right' || layout.direction === 'left';
  const reverse = layout.direction === 'up' || layout.direction === 'left';
  const levels: Array<number> = [];
  const all: Array<MeasuredTreeItem> = [];
  const explicitIds = new Set<string>();
  const collectIds = (item: CanonicalTreeItem | null) => {
    if (item === null) return;
    if (item.node.id !== undefined) explicitIds.add(item.node.id);
    item.children.forEach(collectIds);
  };
  collectIds(root);
  let occurrence = 0;
  const measure = (item: CanonicalTreeItem | null, depth: number): MeasuredTreeItem => {
    let targetId = item?.node.id ?? `tree-node-${occurrence}`;
    while (item?.node.id === undefined && explicitIds.has(targetId)) targetId += '-';
    const result = requiredLayoutProbe(
      context,
      {
        child: {
          type: 'scope',
          ...(scope.style === undefined ? {} : { style: scope.style }),
          ...(scope.theme === undefined ? {} : { theme: scope.theme }),
          ...(scope.defaults === undefined ? {} : { defaults: scope.defaults }),
          children: [item === null ? emptyNode : { ...item.node, id: targetId }],
        },
        occurrence: occurrence++,
      },
      intrinsicLayoutProposal('natural'),
    );
    const main = horizontal ? result.slotSize.width : result.slotSize.height;
    const cross = horizontal ? result.slotSize.height : result.slotSize.width;
    levels[depth] = Math.max(levels[depth] ?? 0, main);
    const measured: MeasuredTreeItem = {
      item,
      result,
      children: [],
      depth,
      targetId,
      span: cross,
      cross: cross / 2,
      childStart: 0,
      x: 0,
      y: 0,
    };
    all.push(measured);
    measured.children = (item?.children ?? []).map(child => measure(child, depth + 1));
    const childSpan =
      measured.children.reduce((sum, child) => sum + child.span, 0) +
      Math.max(0, measured.children.length - 1) * layout.siblingGap;
    const first = measured.children.at(0);
    const last = measured.children.at(-1);
    if (first !== undefined && last !== undefined) {
      // 只根据直属子槽根中心对齐父节点；子树仍以完整包络隔开
      const center = (first.cross + childSpan - last.span + last.cross) / 2;
      measured.childStart = Math.max(0, cross / 2 - center);
      measured.cross = center + measured.childStart;
      measured.span = Math.max(childSpan, center + cross / 2) + measured.childStart;
    }
    return measured;
  };
  const tree = root === null ? undefined : measure(root, 0);
  const mainSize = levels.reduce((sum, size) => sum + size, 0) + Math.max(0, levels.length - 1) * layout.levelGap;
  const centers: Array<number> = [];
  let cursor = 0;
  for (const size of levels) {
    centers.push(cursor + size / 2);
    cursor += size + layout.levelGap;
  }
  const place = (item: MeasuredTreeItem, start: number) => {
    const cross = start + item.cross;
    const main = reverse ? mainSize - centers[item.depth] : centers[item.depth];
    item.x = horizontal ? main : cross;
    item.y = horizontal ? cross : main;
    let offset = start + item.childStart;
    for (const child of item.children) {
      place(child, offset);
      offset += child.span + layout.siblingGap;
    }
  };
  if (tree !== undefined) place(tree, 0);
  const width = horizontal ? mainSize : (tree?.span ?? 0);
  const height = horizontal ? (tree?.span ?? 0) : mainSize;
  const axis = (name: 'x' | 'y', natural: number) =>
    resolveLayoutAxisSize({
      axis: name,
      policy: { kind: 'content' },
      proposal: context.proposal[name],
      minimumContribution: natural,
      naturalContribution: natural,
    }).allocationSize;
  const allocationBounds = { x: 0, y: 0, width: axis('x', width), height: axis('y', height) };
  if (allocationBounds.width + 1e-8 < width || allocationBounds.height + 1e-8 < height)
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.PipelineInvariant,
      message: 'Tree allocation cannot fit its nodes and gaps.',
      details: { allocationBounds, width, height },
    });
  const nodes: Array<IRChild | ReturnType<typeof context.replay>> = [];
  const anonymousNodes: Array<ReturnType<typeof context.replay>> = [];
  const paths: Array<IRPath> = [];
  for (const item of all) {
    if (item.item === null) continue;
    const { result } = item;
    const output = item.item.node.id === undefined ? anonymousNodes : nodes;
    output.push(
      context.replay(result, {
        transforms: [
          {
            kind: 'translate',
            x: item.x - result.slotSize.width / 2 - result.allocationBounds.x,
            y: item.y - result.slotSize.height / 2 - result.allocationBounds.y,
          },
        ],
      }),
    );
  }
  for (const parent of all) {
    if (parent.item === null) continue;
    for (const child of parent.children) {
      if (child.item === null || child.item.connection === false) continue;
      const { route, fraction, path } = child.item.connection;
      const from = { id: parent.targetId };
      const to = { id: child.targetId };
      const step: IRStep =
        route === 'straight'
          ? { type: 'step', kind: 'line', to }
          : route === '-|-' || route === '|-|'
            ? { type: 'step', kind: 'fold', via: route, ...(fraction === undefined ? {} : { fraction }), to }
            : { type: 'step', kind: 'fold', via: route, to };
      paths.push({ ...path, type: 'path', children: [{ type: 'step', kind: 'move', to: from }, step] });
    }
  }
  const children: Array<IRChild | ReturnType<typeof context.scope>> = [
    ...nodes,
    // 匿名节点与内部路径共享局部命名空间，显式节点仍可从外部引用
    context.scope({ localNamespace: true }, [
      ...anonymousNodes,
      ...(paths.length === 0 ? [] : [context.scope({ zIndex: -1 }, paths)]),
    ]),
  ];
  if (label !== undefined)
    children.push({
      type: 'node',
      shape: 'rectangle',
      position: [allocationBounds.width / 2, allocationBounds.height / 2],
      style: { fill: 'none', stroke: 'none', strokeWidth: 0 },
      layout: {
        minimumSize: { width: allocationBounds.width, height: allocationBounds.height },
        padding: 0,
        margin: 0,
      },
      label,
    });
  return {
    allocationBounds,
    children: [context.scope(scope, children, [{ id: 'container', role: 'container', bounds: allocationBounds }])],
  };
};
