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
  IRStepLabel,
  IRTarget,
} from '../ir';
import { parseTargetSugar } from './parseTargetSugar';

/**
 * Sugar 层 way 数组的"关键字常量"。
 *
 * - `DrawWay.Cycle`：闭合到 way 起点（way 元素位置）。**底层字符串故意取得很丑**
 *   （`'retikz-keyword_cycle'`），保证不会与任何合理的节点 id 冲突；用户应当
 *   只通过 `DrawWay.Cycle` 引用，不要直接写裸字面量。
 * - `DrawWay.Hv`：折角算子，先水平后垂直（裸字面量 `'-|'`）。
 * - `DrawWay.Vh`：折角算子，先垂直后水平（裸字面量 `'|-'`）。
 * - `DrawWay.Relative` / `DrawWay.Accumulate`：相对偏移 way item 的 `type` 鉴别字段值。
 *   配合 `{ position: [dx, dy], type: DrawWay.Relative | DrawWay.Accumulate }` 用——
 *   `Relative` 等价 TikZ `(+x, +y)`（不更新 prevEnd），`Accumulate` 等价 TikZ `(++x, ++y)`
 *   （累积更新）。底层字符串同样刻意写丑，保证不撞节点 id；用户只通过常量引用。
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
  Cycle: 'retikz-keyword_cycle',
  /** 折角：先水平后垂直（TikZ `-|`） */
  Hv: '-|',
  /** 折角：先垂直后水平（TikZ `|-`） */
  Vh: '|-',
  /**
   * 相对偏移 way item 的 `type` 字段值——非累积分支，等价 TikZ `(+x, +y)`。
   * 解析为 IR `{ rel: position }`，**不**推进 prevEnd；多段链式偏移共享同一锚点。
   */
  Relative: 'retikz-keyword_relative',
  /**
   * 相对偏移 way item 的 `type` 字段值——累积分支，等价 TikZ `(++x, ++y)`。
   * 解析为 IR `{ relAccumulate: position }`，每段累积更新 prevEnd。
   */
  Accumulate: 'retikz-keyword_accumulate',
} as const;

/**
 * way 折角算子的字面量类型。`DrawWay.Hv` / `DrawWay.Vh` 与裸字面量等价。
 */
export type WayVia = typeof DrawWay.Hv | typeof DrawWay.Vh;

/**
 * way 闭合关键字的字面量类型，由 `DrawWay.Cycle` 派生。
 */
export type WayCycle = typeof DrawWay.Cycle;

/**
 * 相对偏移 way item（sugar，TS-friendly）：以**前一 step 终点**（首项无前段时回退到 [0, 0]）
 * 为基准的位移。`type: DrawWay.Relative` 不更新 prevEnd（TikZ `(+x, +y)`）；
 * `type: DrawWay.Accumulate` 累积更新（TikZ `(++x, ++y)`）。
 *
 * 与 sugar 字符串 `'+dx,dy'` / `'++dx,dy'` 等价，但对象形态在编辑器里能直接补全
 * `position` / `type` 字段，TS 也能校验元组与鉴别字段值——更适合 IDE 协作。
 *
 * parseWay 在 sugar 层就地翻译为 IR `{ rel }` / `{ relAccumulate }`；IR 持久化
 * 形态保持纯净，仍是带 `rel` / `relAccumulate` discriminator 的对象。
 */
export type WayRelItem = {
  position: [number, number];
  type: typeof DrawWay.Relative | typeof DrawWay.Accumulate;
};

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
 * 边标注的 sugar 形态（ADR-0004）：
 * - 字符串：等价 `{ text: <string> }`，其它字段走默认（midway / above）
 * - 对象：与 IR `step.label` 字面一致
 */
export type WayLabel = IRStepLabel | string;

/**
 * 边标注 prefix 算子（infix）：修饰"下一段"——line / fold / curve / cubic / bend /
 * arc / circle / ellipse 都可承载。挂在 way 中两个 way item 之间，下一个产生段的
 * way item 把它消耗到自己的 IR step.label 上。
 *
 * `cycle` 不允许挂 label（schema 已禁），way 中"label op + cycle"的组合会抛错。
 *
 * 多个 label op 不能直接相邻，way 末尾未消费的 label op 同样抛错——保持"标注总有
 * 段可挂"。
 */
export type WayLabelOp = { label: WayLabel };

/**
 * Sugar 层的 way 数组 DSL 元素。
 *
 * 接受十二种形态：
 * - 节点 id 字符串：`'A'` → line（首项时为 move）
 * - 笛卡尔坐标：`[x, y]` → line
 * - 极坐标：`{ origin?, angle, radius }` → line
 * - 相对偏移对象（sugar，TS-friendly）：`{ position: [dx, dy], type: DrawWay.Relative | DrawWay.Accumulate }`
 *   翻译为 IR `{ rel }` / `{ relAccumulate }`；与裸字符串 `'+dx,dy'` / `'++dx,dy'` 等价
 * - 折角算子：`'-|'` / `'|-'`（或 `DrawWay.Hv` / `DrawWay.Vh`）→ 当前项 +
 *   **下一项**合并成一个折角 step（与 TikZ 的 `(A) -| (B)` infix 写法对齐）
 * - 闭合关键字：`DrawWay.Cycle` → cycle（闭合到起点）
 * - 二次贝塞尔算子（infix）：`{ curve: [cx, cy] }`，与下一项合并为 curve step
 * - 三次贝塞尔算子（infix）：`{ cubic: [[c1x, c1y], [c2x, c2y]] }`，与下一项合并为 cubic step
 * - 弧形简记算子（infix）：`{ bend: 'left' | 'right', angle?: number }`，与下一项合并为 bend step
 * - 弧段算子（infix）：`{ arc: { startAngle, endAngle, radius } }`，以"上一项"为圆心，**不**消耗下一项
 * - 整圆算子（infix）：`{ circle: { radius } }`，以"上一项"为圆心，**不**消耗下一项
 * - 整椭圆算子（infix）：`{ ellipse: { radiusX, radiusY } }`，以"上一项"为圆心，**不**消耗下一项
 *
 * 注意：闭合刻意只走 `DrawWay.Cycle`（底层字符串是 `'retikz-keyword_cycle'`），
 * 这样裸字符串 `'cycle'` 仍可作为正常节点 id 使用。相对偏移的 `Relative` /
 * `Accumulate` 同理刻意写丑——避免与节点 id / Position 形态撞结构。
 */
export type WayItem =
  | IRTarget
  | WayRelItem
  | WayVia
  | WayCycle
  | WayCurveOp
  | WayCubicOp
  | WayBendOp
  | WayArcOp
  | WayCircleOp
  | WayEllipseOp
  | WayLabelOp;

/** way DSL 数组：sugar `<Draw way={...}>` 接受的输入形态 */
export type WayDSL = Array<WayItem>;

const isWayCycle = (item: WayItem): item is WayCycle => item === DrawWay.Cycle;

const isWayVia = (item: WayItem): item is WayVia =>
  item === DrawWay.Hv || item === DrawWay.Vh;

const isPlainObject = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null && !Array.isArray(item);

const isWayRelItem = (item: WayItem): item is WayRelItem =>
  isPlainObject(item) && 'position' in item && 'type' in item;

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

const isWayLabelOp = (item: WayItem): item is WayLabelOp =>
  isPlainObject(item) && 'label' in item;

const isWayOperator = (item: WayItem): boolean =>
  isWayCycle(item) ||
  isWayVia(item) ||
  isWayCurveLike(item) ||
  isWayShapeOp(item) ||
  isWayLabelOp(item);

/** sugar 字符串 / 对象都映射到 IR `step.label`：字符串 = `{ text: s }`，对象原样取 */
const normalizeLabel = (l: WayLabel): IRStepLabel =>
  typeof l === 'string' ? { text: l } : { ...l };

/**
 * 把 sugar 对象形态 `{ position, type }` 翻译为 IR `{ rel } | { relAccumulate }`；
 * 其它形态原样返回。在每个 parseTargetSugar 入口前调用，集中处理。
 */
const desugarRelItem = (item: WayItem): WayItem => {
  if (!isWayRelItem(item)) return item;
  return item.type === DrawWay.Accumulate
    ? { relAccumulate: item.position }
    : { rel: item.position };
};

/** 把 WayItem 归约为它的"目标点"——target 直接返回；算子/关键字返回 null */
const targetOf = (item: WayItem): IRTarget | null => {
  if (isWayOperator(item)) return null;
  return desugarRelItem(item) as IRTarget;
};

/**
 * 把 way 数组翻译为 IRStep 序列。
 *
 * - 第一个元素始终是 move：取 way[0] 的目标点；若 way[0] 是 cycle / via 算子等
 *   非 target 项，则降级到原点 `[0, 0]`（容错）。
 * - 后续元素：
 *   - 普通 target / `WayRelItem` → line
 *   - `DrawWay.Cycle` → cycle 步
 *   - `'-|'` / `'|-'` → 与**下一项**合并成 fold 步；操作符在 way 末尾或后
 *     接非 target 项时抛错
 *   - curve / cubic / bend infix 算子 → 与**下一项**合并成对应 step
 *   - arc / circle / ellipse infix 算子 → 单独成 step（不消耗下一项）
 *   - `{ label }` infix 算子（ADR-0004）→ 修饰**下一段**——挂在该段的
 *     `step.label` 上；连续 label / 末尾 label / cycle 上的 label 均抛错
 *
 * 这是纯函数，住在 core，被各框架 adapter 的 Sugar 组件复用。
 */
export const parseWay = (way: WayDSL): Array<IRStep> => {
  if (way.length < 2) {
    throw new Error('parseWay: way must contain at least 2 items');
  }
  const out: Array<IRStep> = [];

  /** ADR-0004：当前未消费的 label 算子结果——下一个产生段的 way item 消耗它。 */
  let pendingLabel: IRStepLabel | undefined;
  const consumeLabel = (): IRStepLabel | undefined => {
    const l = pendingLabel;
    pendingLabel = undefined;
    return l;
  };

  if (isWayLabelOp(way[0])) {
    throw new Error(
      `parseWay: way[0] must be a target (move start), got label operator`,
    );
  }
  const rawMove = targetOf(way[0]);
  const moveTarget: IRTarget = rawMove === null ? [0, 0] : parseTargetSugar(rawMove);
  const moveStep: IRMoveStep = { type: 'step', kind: 'move', to: moveTarget };
  out.push(moveStep);
  for (let i = 1; i < way.length; i++) {
    const item = way[i];
    if (isWayLabelOp(item)) {
      if (pendingLabel) {
        throw new Error(
          `parseWay: label operator at index ${i} cannot directly follow another label operator`,
        );
      }
      pendingLabel = normalizeLabel(item.label);
      continue;
    }
    if (isWayCycle(item)) {
      if (pendingLabel) {
        throw new Error(
          `parseWay: cycle step cannot carry a label (label operator at index ${i - 1})`,
        );
      }
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
        to: parseTargetSugar(desugarRelItem(next)),
      };
      const label = consumeLabel();
      if (label) fold.label = label;
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
      const target: IRTarget = parseTargetSugar(desugarRelItem(next));
      const label = consumeLabel();
      if (isWayCurveOp(item)) {
        const curve: IRCurveStep = {
          type: 'step',
          kind: 'curve',
          to: target,
          control: item.curve,
        };
        if (label) curve.label = label;
        out.push(curve);
      } else if (isWayCubicOp(item)) {
        const cubic: IRCubicStep = {
          type: 'step',
          kind: 'cubic',
          to: target,
          control1: item.cubic[0],
          control2: item.cubic[1],
        };
        if (label) cubic.label = label;
        out.push(cubic);
      } else {
        const bend: IRBendStep = {
          type: 'step',
          kind: 'bend',
          to: target,
          bendDirection: item.bend,
        };
        if (item.angle !== undefined) bend.bendAngle = item.angle;
        if (label) bend.label = label;
        out.push(bend);
      }
      i++; // 消费 next
      continue;
    }
    if (isWayShapeOp(item)) {
      // 形状算子（arc / circle / ellipse）以"上一项"为圆心，**不**消耗下一项；
      // 后续的 way item 仍按各自规则正常解析。
      const label = consumeLabel();
      if (isWayArcOp(item)) {
        const arc: IRArcStep = {
          type: 'step',
          kind: 'arc',
          startAngle: item.arc.startAngle,
          endAngle: item.arc.endAngle,
          radius: item.arc.radius,
        };
        if (label) arc.label = label;
        out.push(arc);
      } else if (isWayCircleOp(item)) {
        const circle: IRCirclePathStep = {
          type: 'step',
          kind: 'circlePath',
          radius: item.circle.radius,
        };
        if (label) circle.label = label;
        out.push(circle);
      } else {
        const ellipse: IREllipsePathStep = {
          type: 'step',
          kind: 'ellipsePath',
          radiusX: item.ellipse.radiusX,
          radiusY: item.ellipse.radiusY,
        };
        if (label) ellipse.label = label;
        out.push(ellipse);
      }
      continue;
    }
    const lineStep: IRLineStep = {
      type: 'step',
      kind: 'line',
      to: parseTargetSugar(desugarRelItem(item)),
    };
    const label = consumeLabel();
    if (label) lineStep.label = label;
    out.push(lineStep);
  }
  if (pendingLabel) {
    throw new Error(
      `parseWay: label operator at end of way must be followed by a step`,
    );
  }
  return out;
};
