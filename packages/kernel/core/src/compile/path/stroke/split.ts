import type {
  CompiledArrowEnd,
  PathCommand,
  PathPrimitive,
  PathPrimitiveAppearance,
  ScenePrimitive,
  ScenePrimitiveBase,
} from '../../../contract';
import type { StrokeCommandFragment } from './interruption';

/** baseProps：除 commands / endpoint arrows 外 PathPrimitive 公共属性集合（多 sub-path 复用） */
export type PathBaseProps = ScenePrimitiveBase & PathPrimitiveAppearance;

/**
 * 多 sub-path + 有端点箭头：按 sub-path split 成多个 PathPrimitive
 * @description 端点箭头只属于整条 path 的首端和末端；单 sub-path 或无箭头时直接产一个 PathPrimitive
 */
export const splitSubPathsForEndpointArrows = (
  commands: Array<PathCommand>,
  baseProps: PathBaseProps,
  endpointArrows: { arrowStart?: CompiledArrowEnd; arrowEnd?: CompiledArrowEnd },
): { primitive: ScenePrimitive; isGrouped: boolean } => {
  const hasArrows = !!endpointArrows.arrowStart || !!endpointArrows.arrowEnd;

  // 每个 sub-path 起始命令索引（每个 move 都是新 sub-path）
  const subPathStarts: Array<number> = [];
  commands.forEach((cmd, idx) => {
    if (cmd.kind === 'move') subPathStarts.push(idx);
  });

  // 单 sub-path 或无箭头 → 一个 PathPrimitive
  if (!hasArrows || subPathStarts.length <= 1) {
    const primitive: PathPrimitive = {
      type: 'path',
      commands,
      ...baseProps,
      ...endpointArrows,
    };
    return { primitive, isGrouped: false };
  }

  // 多 sub-path + 有箭头：首段挂 arrowStart，末段挂 arrowEnd，中间段不挂箭头。
  const subPathSlices: Array<Array<PathCommand>> = [];

  for (let s = 0; s < subPathStarts.length; s++) {
    const start = subPathStarts[s];
    const end = s + 1 < subPathStarts.length ? subPathStarts[s + 1] : commands.length;
    subPathSlices.push(commands.slice(start, end));
  }

  const subPathPrims: Array<PathPrimitive> = subPathSlices.map((sub, i) => {
    const isFirst = i === 0;
    const isLast = i === subPathSlices.length - 1;

    return {
      type: 'path',
      commands: sub,
      ...baseProps,
      ...(isFirst && endpointArrows.arrowStart ? { arrowStart: endpointArrows.arrowStart } : {}),
      ...(isLast && endpointArrows.arrowEnd ? { arrowEnd: endpointArrows.arrowEnd } : {}),
    };
  });

  const groupPrim: ScenePrimitive = {
    type: 'group',
    children: subPathPrims,
  };

  return { primitive: groupPrim, isGrouped: true };
};

/**
 * 将 interruption fragments 输出为现有 PathPrimitive
 * @description fragment 继承同一视觉 style；只把端点箭头附到含原首尾 drawable occurrence 的 fragment，并按未切断逻辑距离补偿 dash phase
 */
export const emitInterruptedPathFragments = (
  fragments: ReadonlyArray<StrokeCommandFragment>,
  baseProps: PathBaseProps,
  endpointArrows: { arrowStart?: CompiledArrowEnd; arrowEnd?: CompiledArrowEnd },
): ScenePrimitive => {
  const pathPrimitives: Array<PathPrimitive> = fragments.map(fragment => {
    const dashOffset =
      baseProps.dashPattern === undefined ? baseProps.dashOffset : (baseProps.dashOffset ?? 0) - fragment.logicalStart;
    return {
      type: 'path',
      commands: fragment.commands,
      ...baseProps,
      ...(baseProps.dashPattern !== undefined ? { dashOffset } : {}),
      ...(fragment.hasPathStart && endpointArrows.arrowStart !== undefined
        ? { arrowStart: endpointArrows.arrowStart }
        : {}),
      ...(fragment.hasPathEnd && endpointArrows.arrowEnd !== undefined ? { arrowEnd: endpointArrows.arrowEnd } : {}),
    };
  });
  if (pathPrimitives.length === 1) return pathPrimitives[0];

  return { type: 'group', children: pathPrimitives };
};
