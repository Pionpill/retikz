import type {
  IRArcStep,
  IRBendStep,
  IRCirclePathStep,
  IRControlPoint,
  IRCubicStep,
  IRCurveStep,
  IRCycleStep,
  IREllipsePathStep,
  IRFoldStep,
  IRLineStep,
  IRMoveStep,
  IRStep,
  IRTarget,
} from '../ir';

/**
 * Sugar 层 way 数组的"关键字常量"。
 *
 * - `DrawWay.cycle`：闭合到 way 起点（way 元素位置）。**底层字符串故意取得很丑**
 *   （`'retikz-keyword_cycle'`），保证不会与任何合理的节点 id 冲突；用户应当
 *   只通过 `DrawWay.cycle` 引用，不要直接写裸字面量。
 * - `DrawWay.hv`：折角算子，先水平后垂直（裸字面量 `'-|'`）。
 * - `DrawWay.vh`：折角算子，先垂直后水平（裸字面量 `'|-'`）。
 *
 * 折角值（`-|` / `|-`）含特殊字符，与节点 id 不会冲突，因此**保留字面量与
 * 常量两种写法都合法**。way 数组里直接放 `'-|'` 或 `'|-'`（infix 算子）
 * 即把"上一项 → 下一项"那一段改成折角。
 *
 * 这里**故意不用 TS enum**——enum 在数值场景下生成 reverse-mapping 表、
 * 在 string 场景下与字面量类型不互通，而 const + `as const` 的字面量联合
 * 既可枚举也可与字面量字符串无缝混用。
 */
export const DrawWay = {
  /**
   * 闭合 way 到起点，等价于 `<Step kind="cycle" />`（TikZ 同名保留字 / SVG `Z`）。
   * 底层字符串值刻意写丑以避开节点 id 冲突；不要硬编码这个字符串。
   */
  cycle: 'retikz-keyword_cycle',
  /** 折角：先水平后垂直（TikZ `-|`） */
  hv: '-|',
  /** 折角：先垂直后水平（TikZ `|-`） */
  vh: '|-',
} as const;

/**
 * way 折角算子的字面量类型。`DrawWay.hv` / `DrawWay.vh` 与裸字面量等价。
 */
export type WayVia = typeof DrawWay.hv | typeof DrawWay.vh;

/**
 * way 闭合关键字的字面量类型，由 `DrawWay.cycle` 派生。
 */
export type WayCycle = typeof DrawWay.cycle;

/**
 * 二次贝塞尔算子（infix）：与折角算子一样坐落两个 target 之间，把
 * "上一项 → 下一项"那段改成 curve step。`curve` 字段携带控制点 `[x, y]`。
 */
export type WayCurveOp = { curve: IRControlPoint };

/**
 * 三次贝塞尔算子（infix）：把"上一项 → 下一项"那段改成 cubic step。
 * `cubic` 字段携带两个控制点 `[c1, c2]`。
 */
export type WayCubicOp = { cubic: [IRControlPoint, IRControlPoint] };

/**
 * 弧形简记算子（infix）：把"上一项 → 下一项"那段改成 bend step。
 * `bend` 字段是方向 `'left'` / `'right'`；`angle` 可选（缺省 30°）。
 */
export type WayBendOp = { bend: 'left' | 'right'; angle?: number };

/**
 * 弧段算子（infix）：以"上一项"为圆心，按起末角度 + 半径画弧；不消耗下一项
 * （形状 step 没有 to 字段）。
 *
 * 注意与曲线 / 折角 infix 算子不同：way 数组里 `[..., target, { arc: {...} }, ...]`
 * 时 arc 算子**只**消耗"前一个 target"作为圆心，**不**与"下一项"合并；
 * 后续的 way item 仍按各自规则解析。
 */
export type WayArcOp = {
  arc: { startAngle: number; endAngle: number; radius: number };
};

/** 整圆算子（infix）：以"上一项"为圆心、给定半径，画整圆。pen 留圆心 */
export type WayCircleOp = { circle: { radius: number } };

/** 整椭圆算子（infix）：以"上一项"为圆心，给定 x/y 半径，画整椭圆。pen 留圆心 */
export type WayEllipseOp = { ellipse: { radiusX: number; radiusY: number } };

/**
 * Sugar 层的 way 数组 DSL 元素。
 *
 * 接受十一种形态：
 * - 节点 id 字符串：`'A'` → line（首项时为 move）
 * - 笛卡尔坐标：`[x, y]` → line
 * - 极坐标：`{ origin?, angle, radius }` → line
 * - 折角算子：`'-|'` / `'|-'`（或 `DrawWay.hv` / `DrawWay.vh`）→ 当前项 +
 *   **下一项**合并成一个折角 step（与 TikZ 的 `(A) -| (B)` infix 写法对齐）
 * - 闭合关键字：`DrawWay.cycle` → cycle（闭合到起点）
 * - 二次贝塞尔算子（infix）：`{ curve: [cx, cy] }`，与下一项合并为 curve step
 * - 三次贝塞尔算子（infix）：`{ cubic: [[c1x, c1y], [c2x, c2y]] }`，与下一项合并为 cubic step
 * - 弧形简记算子（infix）：`{ bend: 'left' | 'right', angle?: number }`，与下一项合并为 bend step
 * - 弧段算子（infix）：`{ arc: { startAngle, endAngle, radius } }`，以"上一项"为圆心，**不**消耗下一项
 * - 整圆算子（infix）：`{ circle: { radius } }`，以"上一项"为圆心，**不**消耗下一项
 * - 整椭圆算子（infix）：`{ ellipse: { radiusX, radiusY } }`，以"上一项"为圆心，**不**消耗下一项
 *
 * 后续会加：相对位移（`{ rel: [x, y] }`）等。
 *
 * 注意：闭合刻意只走 `DrawWay.cycle`（底层字符串是 `'retikz-keyword_cycle'`），
 * 这样裸字符串 `'cycle'` 仍可作为正常节点 id 使用。
 */
export type WayItem =
  | IRTarget
  | WayVia
  | WayCycle
  | WayCurveOp
  | WayCubicOp
  | WayBendOp
  | WayArcOp
  | WayCircleOp
  | WayEllipseOp;

/** way DSL 数组：sugar `<Draw way={...}>` 接受的输入形态 */
export type WayDSL = Array<WayItem>;

const isWayCycle = (item: WayItem): item is WayCycle => item === DrawWay.cycle;

const isWayVia = (item: WayItem): item is WayVia =>
  item === DrawWay.hv || item === DrawWay.vh;

const isPlainObject = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null && !Array.isArray(item);

const isWayCurveOp = (item: WayItem): item is WayCurveOp =>
  isPlainObject(item) && 'curve' in item;

const isWayCubicOp = (item: WayItem): item is WayCubicOp =>
  isPlainObject(item) && 'cubic' in item;

const isWayBendOp = (item: WayItem): item is WayBendOp =>
  isPlainObject(item) && 'bend' in item;

const isWayCurveLike = (
  item: WayItem,
): item is WayCurveOp | WayCubicOp | WayBendOp =>
  isWayCurveOp(item) || isWayCubicOp(item) || isWayBendOp(item);

const isWayArcOp = (item: WayItem): item is WayArcOp =>
  isPlainObject(item) && 'arc' in item;

const isWayCircleOp = (item: WayItem): item is WayCircleOp =>
  isPlainObject(item) && 'circle' in item;

const isWayEllipseOp = (item: WayItem): item is WayEllipseOp =>
  isPlainObject(item) && 'ellipse' in item;

const isWayShapeOp = (
  item: WayItem,
): item is WayArcOp | WayCircleOp | WayEllipseOp =>
  isWayArcOp(item) || isWayCircleOp(item) || isWayEllipseOp(item);

const isWayOperator = (item: WayItem): boolean =>
  isWayCycle(item) ||
  isWayVia(item) ||
  isWayCurveLike(item) ||
  isWayShapeOp(item);

/** 把 WayItem 归约为它的"目标点"——target 直接返回；算子/关键字返回 null */
const targetOf = (item: WayItem): IRTarget | null => {
  if (isWayOperator(item)) return null;
  return item as IRTarget;
};

/**
 * 把 way 数组翻译为 IRStep 序列。
 *
 * - 第一个元素始终是 move：取 way[0] 的目标点；若 way[0] 是 cycle / via 算子等
 *   非 target 项，则降级到原点 `[0, 0]`（容错）。
 * - 后续元素：
 *   - 普通 target → line
 *   - `DrawWay.cycle` → cycle 步
 *   - `'-|'` / `'|-'` → 与**下一项**合并成 fold 步；操作符在 way 末尾或后
 *     接非 target 项时抛错
 *
 * 这是纯函数，住在 core，被各框架 adapter 的 Sugar 组件复用。
 */
export const parseWay = (way: WayDSL): Array<IRStep> => {
  if (way.length < 2) {
    throw new Error('parseWay: way must contain at least 2 items');
  }
  const out: Array<IRStep> = [];
  const moveTarget = targetOf(way[0]) ?? [0, 0];
  const moveStep: IRMoveStep = { type: 'step', kind: 'move', to: moveTarget };
  out.push(moveStep);
  for (let i = 1; i < way.length; i++) {
    const item = way[i];
    if (isWayCycle(item)) {
      const cycle: IRCycleStep = { type: 'step', kind: 'cycle' };
      out.push(cycle);
      continue;
    }
    if (isWayVia(item)) {
      if (i + 1 >= way.length) {
        throw new Error(
          `parseWay: via operator '${item}' at end of way must be followed by a target`,
        );
      }
      const next = way[i + 1];
      if (isWayOperator(next)) {
        throw new Error(
          `parseWay: via operator '${item}' must be followed by a target, got '${String(next)}'`,
        );
      }
      const fold: IRFoldStep = {
        type: 'step',
        kind: 'step',
        via: item,
        to: next as IRTarget,
      };
      out.push(fold);
      i++; // 消费 next
      continue;
    }
    if (isWayCurveLike(item)) {
      if (i + 1 >= way.length) {
        throw new Error(
          `parseWay: curve operator at end of way must be followed by a target`,
        );
      }
      const next = way[i + 1];
      if (isWayOperator(next)) {
        throw new Error(
          `parseWay: curve operator must be followed by a target, got operator/keyword`,
        );
      }
      const target = next as IRTarget;
      if (isWayCurveOp(item)) {
        const curve: IRCurveStep = {
          type: 'step',
          kind: 'curve',
          to: target,
          control: item.curve,
        };
        out.push(curve);
      } else if (isWayCubicOp(item)) {
        const cubic: IRCubicStep = {
          type: 'step',
          kind: 'cubic',
          to: target,
          control1: item.cubic[0],
          control2: item.cubic[1],
        };
        out.push(cubic);
      } else {
        const bend: IRBendStep = {
          type: 'step',
          kind: 'bend',
          to: target,
          bendDirection: item.bend,
        };
        if (item.angle !== undefined) bend.bendAngle = item.angle;
        out.push(bend);
      }
      i++; // 消费 next
      continue;
    }
    if (isWayShapeOp(item)) {
      // 形状算子（arc / circle / ellipse）以"上一项"为圆心，**不**消耗下一项；
      // 后续的 way item 仍按各自规则正常解析。
      if (isWayArcOp(item)) {
        const arc: IRArcStep = {
          type: 'step',
          kind: 'arc',
          startAngle: item.arc.startAngle,
          endAngle: item.arc.endAngle,
          radius: item.arc.radius,
        };
        out.push(arc);
      } else if (isWayCircleOp(item)) {
        const circle: IRCirclePathStep = {
          type: 'step',
          kind: 'circlePath',
          radius: item.circle.radius,
        };
        out.push(circle);
      } else {
        const ellipse: IREllipsePathStep = {
          type: 'step',
          kind: 'ellipsePath',
          radiusX: item.ellipse.radiusX,
          radiusY: item.ellipse.radiusY,
        };
        out.push(ellipse);
      }
      continue;
    }
    const lineStep: IRLineStep = { type: 'step', kind: 'line', to: item };
    out.push(lineStep);
  }
  return out;
};
