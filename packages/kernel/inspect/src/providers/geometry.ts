import type { IRChild, IRPosition, IRStep, PathCommand } from '@retikz/core';
import { alignAngleSweep, DEG_TO_RAD } from '@retikz/core';
import type { AffineMatrix } from '@retikz/math';
import { applyAffine, DEFAULT_EPSILON, localToWorld } from '@retikz/math';

/** 由 Inspector 生成的普通 Path 子项样式 */
export type InspectionPathStyle = Readonly<{
  fill: 'none';
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
  fillOpacity?: number;
  opacity?: number;
  dashPattern?: Array<number>;
  dashOffset?: number;
}>;

type PathChild = Extract<IRChild, { type: 'path' }>;
type ScopeChild = Extract<IRChild, { type: 'scope' }>;

/** 创建不继承主图填充的辅助 Path */
const createPathChild = (children: Array<IRStep>, style: InspectionPathStyle): PathChild => ({
  type: 'path',
  children,
  style,
});

/** 忽略三角函数浮点尾差，合并同一几何位置的辅助标记 */
export const samePosition = (left: IRPosition, right: IRPosition): boolean =>
  Math.abs(left[0] - right[0]) <= DEFAULT_EPSILON && Math.abs(left[1] - right[1]) <= DEFAULT_EPSILON;

/** 内置输出切断作者默认值；第三方 Inspector 仍保留原有片段环境 */
export const isolateInspectionChildren = (children: ReadonlyArray<IRChild>): Array<IRChild> =>
  children.map(child => ({ type: 'scope', defaults: { reset: true }, children: [child] }));

/** 圆弧按参数角求点，角度约定与 Core PathCommand 一致 */
export const pointAtArcCommand = (
  command: Extract<PathCommand, { kind: 'arc' | 'ellipseArc' }>,
  angle: number,
): IRPosition => {
  const radians = (((angle % 360) + 360) % 360) * DEG_TO_RAD;
  if (command.kind === 'arc') {
    return [
      command.center[0] + command.radius * Math.cos(radians),
      command.center[1] + command.radius * Math.sin(radians),
    ];
  }
  const localX = command.radiusX * Math.cos(radians);
  const localY = command.radiusY * Math.sin(radians);
  const rotation = (command.rotation ?? 0) * DEG_TO_RAD;
  return [
    command.center[0] + localX * Math.cos(rotation) - localY * Math.sin(rotation),
    command.center[1] + localX * Math.sin(rotation) + localY * Math.cos(rotation),
  ];
};

/** 把 command 的方向字段折叠为普通 Core arc 可表达的有向角区间 */
export const arcAnglesOf = (
  command: Extract<PathCommand, { kind: 'arc' | 'ellipseArc' }>,
): Readonly<{ start: number; end: number }> =>
  alignAngleSweep(
    command.startAngle,
    command.endAngle,
    command.counterClockwise ?? command.endAngle < command.startAngle,
  );

/** 旋转椭圆弧时，把普通 ellipse arc 放在以圆心为 pivot 的 Scope 中 */
const rotatedEllipseScope = (
  command: Extract<PathCommand, { kind: 'ellipseArc' }>,
  style: InspectionPathStyle,
): ScopeChild => {
  const angles = arcAnglesOf(command);
  const start = pointAtArcCommand({ ...command, rotation: undefined }, angles.start);
  return {
    type: 'scope',
    transforms: [{ kind: 'rotate', degrees: command.rotation ?? 0, pivot: command.center }],
    defaults: { reset: true },
    children: [
      createPathChild(
        [
          { type: 'step', kind: 'move', to: start },
          {
            type: 'step',
            kind: 'arc',
            center: command.center,
            radius: { x: command.radiusX, y: command.radiusY },
            startAngle: angles.start,
            endAngle: angles.end,
          },
        ],
        style,
      ),
    ],
  };
};

/** 确保当前输出 Path 具有一个起点 */
const ensurePathStart = (steps: Array<IRStep>, current: IRPosition | undefined, fallback: IRPosition): IRPosition => {
  if (steps.length === 0) {
    const start = current ?? fallback;
    steps.push({ type: 'step', kind: 'move', to: start });
    return start;
  }
  return current ?? fallback;
};

/** 将最终 PathCommand 转成可编译的普通 IR child；可选地为开放子路径补 cycle */
export const pathCommandsToChildren = (
  commands: ReadonlyArray<PathCommand>,
  style: InspectionPathStyle,
  options: Readonly<{ implicitClose?: boolean }> = {},
): Array<IRChild> => {
  const output: Array<IRChild> = [];
  let steps: Array<IRStep> = [];
  let current: IRPosition | undefined;
  let subpathStart: IRPosition | undefined;
  // 旋转椭圆弧单独放入 Scope；分段后必须显式连回原起点，cycle 只会关闭当前片段
  let splitSubpath = false;

  const flush = (): void => {
    if (steps.length >= 2) output.push(createPathChild(steps, style));
    steps = [];
  };

  const closeOpenPath = (): void => {
    if (subpathStart === undefined) return;
    const pathEnd = current ?? subpathStart;
    if (steps.length === 0) {
      // 整椭圆已回到起点，不额外生成只有 move/cycle 的片段
      if (!samePosition(pathEnd, subpathStart)) {
        steps.push({ type: 'step', kind: 'move', to: pathEnd });
        steps.push({ type: 'step', kind: 'line', to: subpathStart });
        if (!splitSubpath) steps.push({ type: 'step', kind: 'cycle' });
      }
    } else {
      ensurePathStart(steps, current, subpathStart);
      if (steps.length === 1 && steps[0]?.kind === 'move' && samePosition(pathEnd, subpathStart)) {
        steps = [];
      } else if (splitSubpath) {
        if (!samePosition(pathEnd, subpathStart)) {
          steps.push({ type: 'step', kind: 'line', to: subpathStart });
        }
      } else if (steps.at(-1)?.kind !== 'cycle') {
        steps.push({ type: 'step', kind: 'cycle' });
      }
    }
    current = subpathStart;
  };

  for (const command of commands) {
    if (command.kind === 'move') {
      if (options.implicitClose) closeOpenPath();
      flush();
      steps.push({ type: 'step', kind: 'move', to: command.to });
      current = command.to;
      subpathStart = command.to;
      splitSubpath = false;
      continue;
    }

    if (command.kind === 'close') {
      closeOpenPath();
      continue;
    }

    if (command.kind === 'line') {
      ensurePathStart(steps, current, command.to);
      steps.push({ type: 'step', kind: 'line', to: command.to });
      current = command.to;
      continue;
    }

    if (command.kind === 'quad') {
      ensurePathStart(steps, current, command.to);
      steps.push({ type: 'step', kind: 'curve', control: command.control, to: command.to });
      current = command.to;
      continue;
    }

    if (command.kind === 'cubic') {
      ensurePathStart(steps, current, command.to);
      steps.push({
        type: 'step',
        kind: 'cubic',
        control1: command.control1,
        control2: command.control2,
        to: command.to,
      });
      current = command.to;
      continue;
    }

    const angles = arcAnglesOf(command);
    const arcStart = pointAtArcCommand(command, angles.start);
    const arcEnd = pointAtArcCommand(command, angles.end);
    if (command.kind === 'ellipseArc' && command.rotation !== undefined && command.rotation !== 0) {
      if (current !== undefined && !samePosition(current, arcStart)) {
        ensurePathStart(steps, current, arcStart);
        steps.push({ type: 'step', kind: 'line', to: arcStart });
      }
      flush();
      output.push(rotatedEllipseScope(command, style));
      current = arcEnd;
      subpathStart ??= arcStart;
      splitSubpath = true;
      continue;
    }

    ensurePathStart(steps, current, arcStart);
    steps.push({
      type: 'step',
      kind: 'arc',
      center: command.center,
      radius: command.kind === 'arc' ? command.radius : { x: command.radiusX, y: command.radiusY },
      startAngle: angles.start,
      endAngle: angles.end,
    });
    current = arcEnd;
    subpathStart ??= arcStart;
  }

  if (options.implicitClose) closeOpenPath();
  flush();
  return output;
};

/** 以最终 Node rect 生成旋转后的四角 */
export const cornersOfRect = (
  rect: Readonly<{ x: number; y: number; width: number; height: number; rotate?: number }>,
): [IRPosition, IRPosition, IRPosition, IRPosition] => {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const point = (x: number, y: number): IRPosition => localToWorld(rect, [x, y]);
  return [
    point(-halfWidth, -halfHeight),
    point(halfWidth, -halfHeight),
    point(halfWidth, halfHeight),
    point(-halfWidth, halfHeight),
  ];
};

/** 将四角转为闭合矩形 Path */
export const rectCornersToPath = (
  corners: readonly [IRPosition, IRPosition, IRPosition, IRPosition],
  style: InspectionPathStyle,
): IRChild => {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  return createPathChild(
    [
      { type: 'step', kind: 'move', to: topLeft },
      { type: 'step', kind: 'line', to: topRight },
      { type: 'step', kind: 'line', to: bottomRight },
      { type: 'step', kind: 'line', to: bottomLeft },
      { type: 'step', kind: 'cycle' },
    ],
    style,
  );
};

/** 以 affine 正向投影矩形四角并求 Scene 轴向包络 */
export const sceneBoundsOfRect = (
  rect: Readonly<{ x: number; y: number; width: number; height: number; rotate?: number }>,
  transform: AffineMatrix,
): { corners: [IRPosition, IRPosition, IRPosition, IRPosition]; bounds: [number, number, number, number] } => {
  const corners = cornersOfRect(rect).map(corner => applyAffine(transform, corner)) as [
    IRPosition,
    IRPosition,
    IRPosition,
    IRPosition,
  ];
  const xs = corners.map(corner => corner[0]);
  const ys = corners.map(corner => corner[1]);
  return {
    corners,
    bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  };
};

/** 生成透明背景的文本标签 Node */
export const labelNode = (position: IRPosition, text: string, color: string): IRChild => ({
  type: 'node',
  position,
  text,
  layout: { padding: 2 },
  style: {
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
    textColor: color,
    font: { size: 10 },
  },
});

/** 生成检查器使用的点标记 Node */
export const markerNode = (position: IRPosition, color: string, size = 6): IRChild => ({
  type: 'node',
  position,
  shape: 'circle',
  layout: { minimumSize: size, padding: 0 },
  style: {
    fill: color,
    stroke: color,
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWidth: 1,
    opacity: 1,
  },
});

/** 生成明确无填充的辅助路径样式 */
export const pathStyle = (
  color: string,
  options: Readonly<Partial<Omit<InspectionPathStyle, 'fill' | 'stroke'>>> = {},
): InspectionPathStyle => ({
  fill: 'none',
  stroke: color,
  strokeWidth: 1,
  opacity: 1,
  ...options,
});
