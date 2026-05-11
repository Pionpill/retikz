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
 * Sugar 层 way 数组的关键字常量
 * @description Cycle 闭合到 way 起点（底层字符串故意写丑避节点 id 冲突，只通过 DrawWay.Cycle 引用）；Hv/Vh 折角算子（裸字面量 `-|`/`|-` 与常量等价）；Relative/Accumulate 相对偏移 way item 的 type 鉴别值（Relative=TikZ `(+x,+y)` 不推进 prevEnd，Accumulate=TikZ `(++x,++y)` 累积更新）。用 const + as const 而非 TS enum 避免 reverse-mapping 与字面量不互通
 */
export const DrawWay = {
  /** 闭合到起点（TikZ `cycle` / SVG `Z`），底层字符串刻意写丑，不要硬编码 */
  Cycle: 'retikz-keyword_cycle',
  /** 折角：先水平后垂直（TikZ `-|`） */
  Hv: '-|',
  /** 折角：先垂直后水平（TikZ `|-`） */
  Vh: '|-',
  /** 相对偏移 type：非累积（TikZ `(+x,+y)`），不推进 prevEnd */
  Relative: 'retikz-keyword_relative',
  /** 相对偏移 type：累积（TikZ `(++x,++y)`），每段更新 prevEnd */
  Accumulate: 'retikz-keyword_accumulate',
} as const;

/** way 折角算子字面量类型 */
export type WayVia = typeof DrawWay.Hv | typeof DrawWay.Vh;

/** way 闭合关键字字面量类型 */
export type WayCycle = typeof DrawWay.Cycle;

/**
 * 相对偏移 way item（sugar，TS-friendly），与字符串 `'+dx,dy'`/`'++dx,dy'` 等价
 * @description 以前一 step 终点为基准（首项回退 [0,0]）；Relative 不更新 prevEnd，Accumulate 累积更新。对象形态便于 IDE 补全字段；parseWay 在 sugar 层就地翻译为 IR `{rel}`/`{relAccumulate}`
 */
export type WayRelItem = {
  position: [number, number];
  type: typeof DrawWay.Relative | typeof DrawWay.Accumulate;
};

/** 二次贝塞尔算子（infix）：把"上一项→下一项"段改成 curve step，curve 字段携控制点 */
export type WayCurveOp = { curve: IRControlPoint };

/** 三次贝塞尔算子（infix）：cubic step；cubic 字段携两个控制点 */
export type WayCubicOp = { cubic: [IRControlPoint, IRControlPoint] };

/** 弧形简记算子（infix）：bend step；bend=方向，angle 可选缺省 30° */
export type WayBendOp = { bend: 'left' | 'right'; angle?: number };

/**
 * 弧段算子（infix），以上一项为圆心
 * @description 按起末角度 + 半径画弧；与 curve/fold infix 不同——只消耗前一 target 作圆心，不与下一项合并
 */
export type WayArcOp = {
  arc: { startAngle: number; endAngle: number; radius: number };
};

/** 整圆算子（infix），以上一项为圆心、给定半径画整圆，pen 留圆心 */
export type WayCircleOp = { circle: { radius: number } };

/** 整椭圆算子（infix），以上一项为圆心、给定 x/y 半径画整椭圆，pen 留圆心 */
export type WayEllipseOp = { ellipse: { radiusX: number; radiusY: number } };

/** 边标注 sugar 形态（ADR-0004）：字符串=`{text:s}`，对象=IR `step.label` 字面一致 */
export type WayLabel = IRStepLabel | string;

/**
 * 边标注 prefix 算子（infix），修饰下一段
 * @description line/fold/curve/cubic/bend/arc/circle/ellipse 都可承载；下一个产生段的 way item 消耗到自己的 step.label 上。cycle 不允许挂 label；连续 label/末尾未消费 label 均抛错
 */
export type WayLabelOp = { label: WayLabel };

/**
 * Sugar 层 way 数组 DSL 元素（十二种形态）
 * @description 节点 id 字符串/笛卡尔/极坐标 → line（首项 move）；`{position,type}` 相对偏移对象 → IR rel/relAccumulate；`-|`/`|-` 与下一项合并 fold；DrawWay.Cycle → cycle；curve/cubic/bend infix 与下一项合并；arc/circle/ellipse infix 以上一项为圆心不消耗下一项。Cycle/Relative/Accumulate 底层字符串刻意写丑避节点 id 撞结构
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

/** way DSL 数组：sugar `<Draw way={...}>` 输入形态 */
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

/** sugar 字符串/对象 → IR step.label（字符串 = `{text:s}`） */
const normalizeLabel = (l: WayLabel): IRStepLabel =>
  typeof l === 'string' ? { text: l } : { ...l };

/** sugar `{position,type}` → IR `{rel}|{relAccumulate}`；其它形态原样返回 */
const desugarRelItem = (item: WayItem): WayItem => {
  if (!isWayRelItem(item)) return item;
  return item.type === DrawWay.Accumulate
    ? { relAccumulate: item.position }
    : { rel: item.position };
};

/** WayItem 归约为"目标点"，算子/关键字返回 null */
const targetOf = (item: WayItem): IRTarget | null => {
  if (isWayOperator(item)) return null;
  return desugarRelItem(item) as IRTarget;
};

/**
 * way 数组 → IRStep 序列
 * @description 首元素始终 move（way[0] 是算子时降级到原点 [0,0]）；后续元素按各自规则：target/RelItem→line；Cycle→cycle；-|/|- 与下一项合并 fold；curve/cubic/bend 与下一项合并；arc/circle/ellipse 单独成 step；label 算子修饰下一段。连续 label/末尾 label/cycle 上的 label 抛错。纯函数，各框架 adapter Sugar 组件复用
 */
export const parseWay = (way: WayDSL): Array<IRStep> => {
  if (way.length < 2) {
    throw new Error('parseWay: way must contain at least 2 items');
  }
  const out: Array<IRStep> = [];

  /** 当前未消费的 label 算子结果，下一个产生段的 way item 消耗（ADR-0004） */
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
      // 形状算子（arc/circle/ellipse）以上一项为圆心，不消耗下一项
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
