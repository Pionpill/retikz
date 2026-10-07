import type { CanonicalChainConnection, CanonicalChainLayout } from './resolve';
import type { ChainBlock, ChainCellPlacement, MeasuredChainItem } from './types';

/** 平移块内坐标，保持端点引用一致 */
const moveBlock = (block: ChainBlock, x: number, y: number) => {
  for (const cell of block.cells) {
    cell.x += x;
    cell.y += y;
  }
};

/** 根据短支路策略选择第一条轨道 */
const computeTrackOffset = (count: number, total: number, justify: CanonicalChainLayout['justify']) =>
  justify === 'end' ? total - count : justify === 'center' ? Math.floor((total - count) / 2) : 0;

/** 拼装已经测量的直属序列 */
const layoutChainSequence = (
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
    connections: ChainBlock['connections'] = [];
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
          const rail = block.parallel ? start - gap / 2 : previous.parallel ? x - gap / 2 : undefined;
          const autoFraction =
            options.route === 'auto' && rail !== undefined
              ? (rail - from.x - from.width / 2) / (to.x + to.width / 2 - from.x - from.width / 2)
              : undefined;

          connections.push({ from, to, options, autoFraction });
        }
    }

    cells.push(...block.cells);
    connections.push(...block.connections);
    x += slot;
  }

  const result: ChainBlock = {
    width: x,
    height: maxY - minY,
    baseline: -minY,
    cells,
    connections,
    entries: blocks[0]?.entries ?? [],
    exits: blocks.at(-1)?.exits ?? [],
  };
  moveBlock(result, 0, -minY);

  return result;
};

/** 将多条序列组成有序分支包围盒 */
const layoutChainParallel = (
  branches: Array<Array<ChainBlock>>,
  layout: CanonicalChainLayout,
  connection: CanonicalChainConnection,
  parentHeight: number,
): ChainBlock => {
  const count = branches.reduce((maximum, branch) => Math.max(maximum, branch.length), 0);
  const tracks = layout.spacing === 'steps' ? Array<number>(count).fill(0) : undefined;
  if (tracks)
    for (const branch of branches) {
      const offset = computeTrackOffset(branch.length, count, layout.justify);
      branch.forEach((block, i) => {
        tracks[offset + i] = Math.max(tracks[offset + i], block.width);
      });
    }

  const trackGaps = Array<number>(Math.max(0, count - 1)).fill(0);
  if (tracks)
    for (const branch of branches) {
      const offset = computeTrackOffset(branch.length, count, layout.justify);

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
      computeTrackOffset(branch.length, count, layout.justify),
      tracks ? trackGaps : undefined,
    ),
  );
  const width = sequences.reduce((maximum, branch) => Math.max(maximum, branch.width), 0);
  let y = 0;
  const cells: Array<ChainCellPlacement> = [],
    connections: ChainBlock['connections'] = [],
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
    connections.push(...branch.connections);
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

  return { width, height, baseline, cells, connections, entries, exits, parallel: { layout, connection } };
};

/** 将测量树递归合并为主轴坐标中的完整布局块 */
export const layoutChainItems = (
  items: Array<MeasuredChainItem>,
  layout: CanonicalChainLayout,
  connection: CanonicalChainConnection,
  down: boolean,
): ChainBlock => {
  const buildBlocks = (branchItems: Array<MeasuredChainItem>): Array<ChainBlock> => {
    const blocks: Array<ChainBlock> = [];
    for (const item of branchItems) {
      if (item.kind === 'cell') {
        const cell: ChainCellPlacement = {
          measured: item.measured,
          x: 0,
          y: 0,
          width: down ? item.measured.height : item.measured.width,
          height: down ? item.measured.width : item.measured.height,
        };
        blocks.push({
          width: cell.width,
          height: cell.height,
          baseline: cell.height / 2,
          cells: [cell],
          connections: [],
          entries: [cell],
          exits: [cell],
        });
      } else {
        blocks.push(
          layoutChainParallel(item.branches.map(buildBlocks), item.layout, item.connection, blocks.at(-1)!.height),
        );
      }
    }
    return blocks;
  };
  return layoutChainSequence(buildBlocks(items), layout, connection);
};
