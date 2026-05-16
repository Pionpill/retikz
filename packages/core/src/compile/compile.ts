import { rect as rectOps } from '../geometry/rect';
import type { IR, IRPosition } from '../ir';
import type { Scene, ScenePrimitive } from '../primitive';
import { type NodeLayout, emitNodePrimitives, layoutNode } from './node';
import { emitPathPrimitive } from './path/index';
import { resolvePosition } from './position';
import { DEFAULT_PRECISION, makeRound } from './precision';
import { type TextMeasurer, fallbackMeasurer } from './text-metrics';
import { computeLayout } from './layout';

/**
 * 把 coordinate 注册成 0×0 NodeLayout
 * @description 让后续 path target / `at.of` 引用时 boundaryPoint 命中中心，符合"占位无形状边界"语义
 */
const coordinateAsLayout = (
  id: string,
  center: IRPosition,
): NodeLayout => ({
  id,
  shape: 'rectangle',
  rect: { x: center[0], y: center[1], width: 0, height: 0, rotate: 0 },
  rotateDeg: 0,
  margin: 0,
  textWidth: 0,
  textHeight: 0,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
});

/** 编译期警告：path / position 解析失败时通过 `CompileOptions.onWarn` 发出，不影响编译产物 */
export type CompileWarning = {
  /**
   * 警告类型代码（机器可读）
   * @description 用户可按 code 分支处理；未来 alpha 加新 code 不破坏调用方
   */
  code:
    | 'UNRESOLVED_NODE_REFERENCE'
    | 'PATH_TOO_SHORT'
    | 'ANCHOR_RESOLUTION_FAILED'
    | 'OFFSET_BASE_UNRESOLVED'
    | 'POLAR_ORIGIN_UNRESOLVED'
    | 'AT_TARGET_UNRESOLVED'
    | 'RELATIVE_INITIAL_NO_PREV_END'
    | 'BBOX_EXTREME_INPUT'
    | (string & {});
  /** 人类可读消息（英文） */
  message: string;
  /** IR locator 路径（jq-like，如 `'children[3].path.children[1].to'`） */
  path: string;
};

/** compileToScene 的可选参数 */
export type CompileOptions = {
  /** 注入文字度量函数；不传则用 fallback（不准但可跑） */
  measureText?: TextMeasurer;
  /** layout 周围的留白（user units），默认 10 */
  padding?: number;
  /**
   * 输出坐标的小数位精度；默认 2
   * @description 仅作用于 Scene primitive / path d / layout；内部几何计算保持完整 double 精度
   */
  precision?: number;
  /**
   * 相对定位的默认距离（对应 TikZ `node distance`，user units）
   * @description `Node.position` 为 `{ direction, of }` 且未自带 `distance` 时取此值；未配回退到 1
   */
  nodeDistance?: number;
  /**
   * 编译期警告收集器
   * @description path / position 解析失败时按 IR locator + code + message 同步触发；不传时 dev 模式（`process.env.NODE_ENV !== 'production'`）默认 `console.warn`、生产静默
   */
  onWarn?: (warning: CompileWarning) => void;
};

/**
 * 默认 warn dispatcher：dev 模式 console.warn、生产静默
 * @description 用户传 onWarn 时使用用户的；不传走此 fallback
 */
const defaultWarnDispatcher = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(`[retikz] ${warning.code} at ${warning.path}: ${warning.message}`);
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @description Pass 1 处理 Node/coordinate 并注册 nodeIndex、发 primitive、累积 bbox；Pass 2 解析 Path 端点写 d 字符串；末端按 precision 折算 layout
 */
export const compileToScene = (ir: IR, options: CompileOptions = {}): Scene => {
  const measureText = options.measureText ?? fallbackMeasurer;
  const layoutPadding = options.padding ?? 10;
  const round = makeRound(options.precision ?? DEFAULT_PRECISION);
  const nodeDistance = options.nodeDistance;
  const onWarn = options.onWarn ?? defaultWarnDispatcher;

  const primitives: Array<ScenePrimitive> = [];
  const nodeIndex = new Map<string, NodeLayout>();
  const allPoints: Array<IRPosition> = [];

  // Pass 1: 节点布局——按 IR children 源码顺序遍历 Node / Coordinate，把 layout 注册到 nodeIndex
  // 但不发 primitive；polar.origin 引用其它节点 id 时，要求被引用节点在 IR 中先定义。
  // Path 的引用解析也走 nodeIndex，所以必须先完成所有 node / coordinate 的注册。
  const nodeLayouts = new Map<number, NodeLayout>();
  for (let i = 0; i < ir.children.length; i++) {
    const child = ir.children[i];
    if (child.type === 'node') {
      const layout = layoutNode(child, measureText, nodeIndex, nodeDistance);
      if (child.id) nodeIndex.set(child.id, layout);
      nodeLayouts.set(i, layout);
    } else if (child.type === 'coordinate') {
      const center = resolvePosition(child.position, nodeIndex, nodeDistance);
      if (!center) {
        onWarn({
          code: 'POLAR_ORIGIN_UNRESOLVED',
          message: `Cannot resolve position for coordinate '${child.id}'; polar.origin or at.of may reference an undefined node`,
          path: `children[${i}].coordinate.position`,
        });
        // 兼容旧行为：依然 throw（coordinate 解析失败是 IR 完整性错误，不仅是路径丢失）
        throw new Error(
          `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
        );
      }
      nodeIndex.set(child.id, coordinateAsLayout(child.id, center));
    }
  }

  // Pass 2: 按 IR children 源码顺序发 primitive——Node 复用 Pass 1 算好的 layout，Path 解析 nodeIndex
  // 这样 SVG z-order = JSX 顺序：用户写在前面的元素在下层，后面的在上层（与 SVG / DOM 直觉一致）。
  // coordinate 不发 primitive、不扩 bbox。
  for (let i = 0; i < ir.children.length; i++) {
    const child = ir.children[i];
    if (child.type === 'node') {
      const layout = nodeLayouts.get(i);
      if (!layout) continue; // 防御：Pass 1 一定写入了
      for (const prim of emitNodePrimitives(layout, round)) {
        primitives.push(prim);
      }
      // 用旋转感知的 4 角扩 bbox（保持完整精度，computeLayout 末端再 round）
      allPoints.push(
        rectOps.anchor(layout.rect, 'north-west'),
        rectOps.anchor(layout.rect, 'north-east'),
        rectOps.anchor(layout.rect, 'south-west'),
        rectOps.anchor(layout.rect, 'south-east'),
      );
    } else if (child.type === 'path') {
      const result = emitPathPrimitive(child, nodeIndex, round, measureText, {
        onWarn,
        irPath: `children[${i}].path`,
      });
      if (result) {
        for (const prim of result.primitives) primitives.push(prim);
        for (const p of result.points) allPoints.push(p);
      }
    }
  }

  return {
    primitives,
    layout: computeLayout(allPoints, layoutPadding, round),
  };
};
