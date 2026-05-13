import type { ArrowEndSpec, PathCommand, PathPrim, ScenePrimitive } from '../../primitive';

/** baseProps：除 commands/markers 外 PathPrim 公共属性集合（多 sub-path 复用） */
export type PathBaseProps = Omit<PathPrim, 'type' | 'commands' | 'arrowStart' | 'arrowEnd'>;

/**
 * 多 sub-path + 有箭头：按 sub-path split 成多个 PathPrim，仅首段挂 arrowStart / 末段挂 arrowEnd，包进 GroupPrim
 * @description SVG marker 按每个 sub-path 单独贴会在中间节点视觉错乱，故仅首末段挂；单 sub-path 或无箭头直接产一个 PathPrim
 */
export const splitSubPathsForMarkers = (
  commands: Array<PathCommand>,
  baseProps: PathBaseProps,
  markers: { arrowStart?: ArrowEndSpec; arrowEnd?: ArrowEndSpec },
): { primitive: ScenePrimitive; isGrouped: boolean } => {
  const hasArrows = !!markers.arrowStart || !!markers.arrowEnd;
  // 每个 sub-path 起始命令索引（每个 move 都是新 sub-path）
  const subPathStarts: Array<number> = [];
  commands.forEach((cmd, idx) => {
    if (cmd.kind === 'move') subPathStarts.push(idx);
  });

  // 单 sub-path 或无箭头 → 一个 PathPrim
  if (!hasArrows || subPathStarts.length <= 1) {
    const primitive: PathPrim = {
      type: 'path',
      commands,
      ...baseProps,
      ...markers,
    };
    return { primitive, isGrouped: false };
  }

  // 多 sub-path + 有箭头：split 成多个 PathPrim 各挂"首段 marker-start/末段 marker-end"用 GroupPrim 包；
  // 否则 SVG marker 会按每个 sub-path 单独贴在中间节点视觉错乱
  const subPathSlices: Array<Array<PathCommand>> = [];
  for (let s = 0; s < subPathStarts.length; s++) {
    const start = subPathStarts[s];
    const end = s + 1 < subPathStarts.length ? subPathStarts[s + 1] : commands.length;
    subPathSlices.push(commands.slice(start, end));
  }
  const subPathPrims: Array<PathPrim> = subPathSlices.map((sub, i) => {
    const isFirst = i === 0;
    const isLast = i === subPathSlices.length - 1;
    return {
      type: 'path',
      commands: sub,
      ...baseProps,
      ...(isFirst && markers.arrowStart ? { arrowStart: markers.arrowStart } : {}),
      ...(isLast && markers.arrowEnd ? { arrowEnd: markers.arrowEnd } : {}),
    };
  });

  const groupPrim: ScenePrimitive = {
    type: 'group',
    children: subPathPrims,
  };
  return { primitive: groupPrim, isGrouped: true };
};
