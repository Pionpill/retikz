import type { Position } from '@retikz/math';

import type { BranchLayoutOutput } from '../contract';
import { defineBranchLayout } from '../contract';

/** 保持主线、共享节点与稳定推进的内置轨道布局 */
export const LanesBranchLayoutDefinition = defineBranchLayout({
  name: 'lanes',
  description: 'Stable topological progression with shared nodes and a continuous main branch.',
  layout: input => {
    const vertical = input.layout.direction === 'down' || input.layout.direction === 'up';
    const reverse = input.layout.direction === 'left' || input.layout.direction === 'up';
    const lanes = new Map<string, number>();
    const main = input.branches.find(branch => branch.id === input.mainBranch);
    const branches = main === undefined ? input.branches : [main, ...input.branches.filter(branch => branch !== main)];
    let nextLane = 0;

    for (const branch of branches) {
      let added = false;

      for (const id of branch.nodes)
        if (!lanes.has(id)) {
          lanes.set(id, nextLane);
          added = true;
        }

      if (added) nextLane += 1;
    }

    const cross = Array.from({ length: nextLane }, () => ({ before: 0, after: 0 }));

    for (const node of input.nodes) {
      const bounds = node.visualBounds;
      const start = vertical ? bounds.x : bounds.y;
      const size = vertical ? bounds.width : bounds.height;
      const lane = cross[lanes.get(node.id)!];
      lane.before = Math.max(lane.before, -start);
      lane.after = Math.max(lane.after, start + size);
    }

    const centers: Array<number> = [];
    cross.forEach((lane, index) =>
      centers.push(
        index === 0 ? lane.before : centers[index - 1] + cross[index - 1].after + input.layout.laneGap + lane.before,
      ),
    );
    let cursor = 0;
    const nodes = input.nodes.map(node => {
      const bounds = node.visualBounds;
      const start = vertical ? bounds.y : bounds.x;
      const size = vertical ? bounds.height : bounds.width;
      const before = reverse ? start + size : -start;
      const after = reverse ? -start : start + size;
      cursor += before;
      const progress = reverse ? -cursor : cursor;
      const lane = lanes.get(node.id)!;
      const position: Position = vertical ? [centers[lane], progress] : [progress, centers[lane]];
      cursor += after + input.layout.nodeGap;

      return { id: node.id, position, lane };
    });
    const byId = new Map(nodes.map(node => [node.id, node]));
    const seen = new Set<string>();
    const segments: Array<BranchLayoutOutput['segments'][number]> = [];

    for (const branch of input.branches)
      for (let index = 1; index < branch.nodes.length; index += 1) {
        const source = branch.nodes[index - 1];
        const target = branch.nodes[index];
        const key = JSON.stringify([source, target]);
        if (seen.has(key)) continue;

        seen.add(key);
        const from = byId.get(source)!;
        const to = byId.get(target)!;
        const middle = (from.position[vertical ? 1 : 0] + to.position[vertical ? 1 : 0]) / 2;
        const bends: Array<Position> =
          from.lane === to.lane
            ? []
            : vertical
              ? [
                  [from.position[0], middle],
                  [to.position[0], middle],
                ]
              : [
                  [middle, from.position[1]],
                  [middle, to.position[1]],
                ];
        segments.push({
          source,
          target,
          points: [from.position, ...bends, to.position],
          cornerRadius: bends.length === 0 ? 0 : 8,
        });
      }

    return { nodes, segments };
  },
});
