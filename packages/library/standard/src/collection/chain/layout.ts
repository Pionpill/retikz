import type { MeasuredCell } from '../_cell';
import type { CanonicalChainConnection, CanonicalChainLayout } from './resolve';
/** 主轴坐标中的单元位置 */
export type ChainCellPlacement = { measured: MeasuredCell; x: number; y: number; width: number; height: number };
/** 连线的主轴点列与呈现 */
export type ChainEdge = { points: Array<[number, number]>; connection: CanonicalChainConnection };
/** 保留主轴基线的完整布局块 */
export type ChainBlock = {
  width: number;
  height: number;
  baseline: number;
  cells: Array<ChainCellPlacement>;
  edges: Array<ChainEdge>;
  entries: Array<ChainCellPlacement>;
  exits: Array<ChainCellPlacement>;
  parallel?: { layout: CanonicalChainLayout; connection: CanonicalChainConnection };
};
/** 平移块内坐标，保持端点引用一致 */
const moveBlock = (block: ChainBlock, x: number, y: number) => {
  for (const cell of block.cells) {
    cell.x += x;
    cell.y += y;
  }
  for (const edge of block.edges)
    for (const point of edge.points) {
      point[0] += x;
      point[1] += y;
    }
};
/** 根据短支路策略选择第一条轨道 */
export const chainTrackOffset = (count: number, total: number, justify: CanonicalChainLayout['justify']) =>
  justify === 'end' ? total - count : justify === 'center' ? Math.floor((total - count) / 2) : 0;
/** 拼装已经测量的直属序列 */
export const layoutChainSequence = (
  blocks: Array<ChainBlock>,
  layout: CanonicalChainLayout,
  connection: CanonicalChainConnection,
  tracks?: Array<number>,
  offset = 0,
  trackGaps?: Array<number>,
): ChainBlock => {
  let x = 0,
    minY = 0,
    maxY = 0;
  const cells: Array<ChainCellPlacement> = [],
    edges: Array<ChainEdge> = [];
  if (tracks) for (let i = 0; i < offset; i++) x += tracks[i] + (trackGaps?.[i] ?? layout.gap);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const previous = i > 0 ? blocks[i - 1] : undefined;
    const gap =
      trackGaps?.[i + offset - 1] ?? block.parallel?.layout.gap ?? previous?.parallel?.layout.gap ?? layout.gap;
    if (i > 0) x += gap;
    const slot = tracks?.[i + offset] ?? block.width;
    const start = x + (slot - block.width) / 2;
    moveBlock(block, start, -block.baseline);
    minY = Math.min(minY, -block.baseline);
    maxY = Math.max(maxY, block.height - block.baseline);
    if (previous) {
      const options = block.parallel?.connection ?? previous.parallel?.connection ?? connection;
      for (const from of previous.exits)
        for (const to of block.entries) {
          const a: [number, number] = [from.x + from.width, from.y + from.height / 2],
            z: [number, number] = [to.x, to.y + to.height / 2];
          let points: Array<[number, number]>;
          if (options.route === 'auto') {
            if (block.parallel) {
              const rail = start - gap / 2;
              points = [a, [rail, a[1]], [rail, z[1]], z];
            } else if (previous.parallel) {
              const rail = x - gap / 2;
              points = [a, [rail, a[1]], [rail, z[1]], z];
            } else points = [a, z];
          } else points = [a, z];
          edges.push({ points, connection: options });
        }
    }
    cells.push(...block.cells);
    edges.push(...block.edges);
    x += slot;
  }
  const result: ChainBlock = {
    width: x,
    height: maxY - minY,
    baseline: -minY,
    cells,
    edges,
    entries: blocks[0]?.entries ?? [],
    exits: blocks.at(-1)?.exits ?? [],
  };
  moveBlock(result, 0, -minY);
  return result;
};
/** 将多条序列组成有序分支包围盒 */
export const layoutChainParallel = (
  branches: Array<Array<ChainBlock>>,
  layout: CanonicalChainLayout,
  connection: CanonicalChainConnection,
  parentHeight: number,
): ChainBlock => {
  const count = branches.reduce((maximum, branch) => Math.max(maximum, branch.length), 0);
  const tracks = layout.spacing === 'steps' ? Array<number>(count).fill(0) : undefined;
  if (tracks)
    for (const branch of branches) {
      const offset = chainTrackOffset(branch.length, count, layout.justify);
      branch.forEach((block, i) => {
        tracks[offset + i] = Math.max(tracks[offset + i], block.width);
      });
    }
  const trackGaps = Array<number>(Math.max(0, count - 1)).fill(0);
  if (tracks)
    for (const branch of branches) {
      const offset = chainTrackOffset(branch.length, count, layout.justify);
      for (let i = 1; i < branch.length; i++)
        trackGaps[offset + i - 1] = Math.max(
          trackGaps[offset + i - 1],
          branch[i].parallel?.layout.gap ?? branch[i - 1].parallel?.layout.gap ?? layout.gap,
        );
    }
  const sequences = branches.map(branch =>
    layoutChainSequence(
      branch,
      layout,
      connection,
      tracks,
      chainTrackOffset(branch.length, count, layout.justify),
      tracks ? trackGaps : undefined,
    ),
  );
  const width = sequences.reduce((maximum, branch) => Math.max(maximum, branch.width), 0);
  let y = 0;
  const cells: Array<ChainCellPlacement> = [],
    edges: Array<ChainEdge> = [],
    entries: Array<ChainCellPlacement> = [],
    exits: Array<ChainCellPlacement> = [],
    baselines: Array<number> = [];
  for (const branch of sequences) {
    const x = tracks
      ? 0
      : layout.justify === 'end'
        ? width - branch.width
        : layout.justify === 'center'
          ? (width - branch.width) / 2
          : 0;
    baselines.push(y + branch.baseline);
    moveBlock(branch, x, y);
    cells.push(...branch.cells);
    edges.push(...branch.edges);
    entries.push(...branch.entries);
    exits.push(...branch.exits);
    y += branch.height + layout.branchGap;
  }
  const height = y - layout.branchGap;
  const align = layout.branchAlign;
  const baseline =
    typeof align === 'object'
      ? baselines[align.branch]
      : align === 'start'
        ? parentHeight / 2
        : align === 'end'
          ? height - parentHeight / 2
          : height / 2;
  return { width, height, baseline, cells, edges, entries, exits, parallel: { layout, connection } };
};
