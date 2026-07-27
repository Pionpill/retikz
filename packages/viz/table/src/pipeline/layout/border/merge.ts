import type { ResolvedTableBorderLine } from '../../../contract/manifest';
import type { ResolvedTableBorderAtom, TableBorderEdge, TableBorderVertex } from './types';

import { TableBorderContributionSchema } from '../../../contract/manifest';
import { deepFreeze } from '../../../shared';

/** 递归比较 JSON-safe style，忽略对象属性插入顺序 */
const equalJson = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => equalJson(value, right[index]))
    );
  }
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return equalJson(leftKeys, rightKeys) && leftKeys.every(key => equalJson(leftRecord[key], rightRecord[key]));
};

/** 判断 style 是否允许保持 paint bbox 与 dash phase 不变地合并 */
const isMergeableSolidStyle = (style: ResolvedTableBorderLine): boolean =>
  typeof style.stroke === 'string' && style.stroke !== 'none' && style.dashPattern === undefined;

const vertexKey = (vertex: TableBorderVertex): string => `${vertex.x}:${vertex.y}`;

/** 判断运行时输入是否为 Border Graph 支持的 mode */
const isTableBorderMode = (value: unknown): value is 'collapse' | 'separate' =>
  value === 'collapse' || value === 'separate';

const SideRank = { top: 0, right: 1, bottom: 2, left: 3 } as const;

/** 按 orientation、numeric boundary 或 separate side 排列 draw order */
const compareVisibleAtoms = (left: ResolvedTableBorderAtom, right: ResolvedTableBorderAtom): number => {
  if (left.orientation !== right.orientation && left.key.startsWith('c:') && right.key.startsWith('c:')) {
    return left.orientation === 'horizontal' ? -1 : 1;
  }
  const leftParts = left.key.split(':');
  const rightParts = right.key.split(':');
  if (leftParts[0] === 'c' && rightParts[0] === 'c') {
    const boundary = Number(leftParts[2]) - Number(rightParts[2]);
    return boundary === 0 ? Number(leftParts[3]) - Number(rightParts[3]) : boundary;
  }
  if (leftParts[0] === 's' && rightParts[0] === 's') {
    const row = Number(leftParts[1]) - Number(rightParts[1]);
    if (row !== 0) return row;
    const column = Number(leftParts[2]) - Number(rightParts[2]);
    if (column !== 0) return column;
    return SideRank[leftParts[3] as keyof typeof SideRank] - SideRank[rightParts[3] as keyof typeof SideRank];
  }
  if (left.orientation !== right.orientation) return left.orientation === 'horizontal' ? -1 : 1;
  return left.key.localeCompare(right.key);
};

/** 把单个可见 atom 转成未合并 edge */
const edgeOf = (atom: ResolvedTableBorderAtom): TableBorderEdge => {
  if (atom.winner.kind !== 'line') {
    throw new Error(`table: visible Border Graph atom "${atom.key}" must have a line winner`);
  }
  const contributors = atom.contributors.map(contribution => TableBorderContributionSchema.parse(contribution));
  const winner = contributors.find(contribution => contribution.key === atom.winner.key);
  if (winner?.kind !== 'line') {
    throw new Error(`table: visible Border Graph atom "${atom.key}" winner must match its contributors`);
  }
  return {
    key: `m:${atom.orientation}:${atom.key}:${atom.key}`,
    orientation: atom.orientation,
    start: { ...atom.start },
    end: { ...atom.end },
    style: winner.line,
    atoms: [{ key: atom.key, winner, contributors }],
  };
};

/** 把可见 resolved atoms 确定性合并为 lowering edges */
export const mergeTableBorderAtoms = (
  atoms: ReadonlyArray<ResolvedTableBorderAtom>,
  mode: 'collapse' | 'separate',
): ReadonlyArray<TableBorderEdge> => {
  if (!isTableBorderMode(mode)) {
    throw new Error('table: Border Graph mode must be collapse or separate');
  }
  const visible = atoms.filter(atom => atom.visible).sort(compareVisibleAtoms);
  const perpendicularVertices = new Map<'horizontal' | 'vertical', Set<string>>([
    ['horizontal', new Set<string>()],
    ['vertical', new Set<string>()],
  ]);
  visible.forEach(atom => {
    perpendicularVertices.get(atom.orientation)?.add(vertexKey(atom.start));
    perpendicularVertices.get(atom.orientation)?.add(vertexKey(atom.end));
  });

  const edges: Array<TableBorderEdge> = [];
  visible.forEach(atom => {
    const next = edgeOf(atom);
    if (mode === 'separate') {
      edges.push(next);
      return;
    }
    const previous = edges.at(-1);
    if (previous === undefined) {
      edges.push(next);
      return;
    }
    const opposite = atom.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    const canMerge =
      previous.orientation === next.orientation &&
      previous.end.x === next.start.x &&
      previous.end.y === next.start.y &&
      isMergeableSolidStyle(previous.style) &&
      isMergeableSolidStyle(next.style) &&
      equalJson(previous.style, next.style) &&
      !perpendicularVertices.get(opposite)?.has(vertexKey(previous.end));
    if (!canMerge) {
      edges.push(next);
      return;
    }
    const atomsInEdge = [...previous.atoms, ...next.atoms];
    edges[edges.length - 1] = {
      ...previous,
      key: `m:${previous.orientation}:${atomsInEdge[0].key}:${atomsInEdge.at(-1)?.key ?? atomsInEdge[0].key}`,
      end: { ...next.end },
      atoms: atomsInEdge,
    };
  });
  return deepFreeze(edges);
};
