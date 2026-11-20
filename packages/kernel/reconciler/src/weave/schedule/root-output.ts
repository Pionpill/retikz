import type { ScenePrimitive } from '@retikz/core';
import { mergeLayoutBounds } from '@retikz/core';
import { mergeBounds } from '@retikz/math';

import type { SubtreeCompileState } from '../../compile';
import type { WeaveEntry } from '../shared';
import type { WeaveExecutionContext } from './types';

/** 每次局部更新最多重新读取一块内的相邻贡献，块间只传递图元引用和合并后的边界 */
const blockSize = 32;

/** 声明顺序即绘制顺序且没有跨条目副作用时，从事务内的输出块交付独立的完整图元数组 */
export const collectWeaveRootBlocks = (
  { root, runtime, transaction, paths, indexesChanged }: WeaveExecutionContext,
  executed: Iterable<WeaveEntry>,
  state: SubtreeCompileState,
  appendEntry: (entry: WeaveEntry) => void,
) => {
  const { children } = transaction.readState(root);
  const previous = root.current?.outputBlocks;
  if (runtime.state.execution.provenanceTracker !== undefined || children.length < blockSize) {
    for (const entry of children) appendEntry(entry);
    if (previous !== undefined) transaction.editState(root).outputBlocks = undefined;
    return;
  }

  const blocks = indexesChanged ? [] : (previous?.slice() ?? []);
  const dirty = new Set<number>();
  if (indexesChanged || previous === undefined) {
    for (let i = 0; i < children.length; i += blockSize) dirty.add(i / blockSize);
  } else {
    for (const entry of executed) dirty.add(Math.floor((paths.get(entry)![1] as number) / blockSize));
  }
  rebuild: for (const index of dirty) {
    const primitives: Array<ScenePrimitive> = [];
    let bounds;
    const end = Math.min(children.length, (index + 1) * blockSize);
    for (let i = index * blockSize; i < end; i++) {
      const entry = children[i];
      const contribution = entry.type === 'scope' ? undefined : transaction.readState(entry).contribution;
      if (
        contribution === undefined ||
        contribution.diagnostics.length !== 0 ||
        contribution.output.artifacts.length !== 0 ||
        contribution.resources.clips.length !== 0 ||
        contribution.resources.paints.length !== 0 ||
        contribution.zIndices.some(z => (z ?? 0) !== 0)
      ) {
        blocks[index] = undefined;
        continue rebuild;
      }
      for (const primitive of contribution.output.primitives) primitives.push(primitive);
      for (const item of contribution.output.bounds) bounds = mergeLayoutBounds(bounds, item.boundsPoints, item.shadow);
    }
    blocks[index] = { primitives, bounds };
  }
  transaction.editState(root).outputBlocks = blocks;
  let visualBounds;
  let mixed = false;
  for (const [index, block] of blocks.entries()) {
    if (block === undefined) {
      mixed = true;
      const end = Math.min(children.length, (index + 1) * blockSize);
      for (let i = index * blockSize; i < end; i++) appendEntry(children[i]);
      continue;
    }
    for (const primitive of block.primitives) state.primitives.push(primitive);
    visualBounds = mergeBounds(visualBounds, block.bounds);
  }
  if (mixed) {
    if (visualBounds !== undefined)
      state.bounds.push({
        boundsPoints: [
          [visualBounds.minX, visualBounds.minY],
          [visualBounds.maxX, visualBounds.maxY],
        ],
      });
    return;
  }
  // 每块已确认只含完成图元、默认绘制顺序且没有产物
  return { primitives: state.primitives as Array<ScenePrimitive>, visualBounds, artifacts: [] };
};
