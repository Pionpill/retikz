import type {
  IRArcStep,
  IRAxisLineStep,
  IRAxisLineTarget,
  IRBendStep,
  IRCirclePathStep,
  IRControlPoint,
  IRCubicStep,
  IRCurveStep,
  IREllipsePathStep,
  IRFoldStep,
  IRLineStep,
  IRMoveStep,
  IRStep,
  IRStepAnisotropicRadius,
  IRStepLabel,
  IRStepRadius,
  IRTarget,
} from '@retikz/core';
import { AxisLineTargetSchema, FoldStepVia } from '@retikz/core';
import { NormalizedFractionSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject } from 'zod';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { parseTargetSugar } from './target';

/**
 * Sugar 层 way 数组的关键字常量
 * @description Cycle 闭合到 way 起点（底层字符串故意写丑避节点 id 冲突，只通过 DrawWay.Cycle 引用）；Hv/Vh/Hvh/Vhv 是两段或三段折角算子；Relative/Accumulate 相对偏移 way item 的 type 鉴别值（Relative=TikZ `(+x,+y)` 不推进 prevEnd，Accumulate=TikZ `(++x,++y)` 累积更新）。用 const + as const 而非 TS enum 避免 reverse-mapping 与字面量不互通
 */
export const DrawWay = {
  /** 闭合到起点（TikZ `cycle` / SVG `Z`），底层字符串刻意写丑，不要硬编码 */
  Cycle: 'retikz-keyword_cycle',
  /** 折角：先水平后垂直（TikZ `-|`） */
  Hv: '-|',
  /** 折角：先垂直后水平（TikZ `|-`） */
  Vh: '|-',
  /** 三段折角：水平、垂直、水平 */
  Hvh: '-|-',
  /** 三段折角：垂直、水平、垂直 */
  Vhv: '|-|',
  /** 相对偏移 type：非累积（TikZ `(+x,+y)`），不推进 prevEnd */
  Relative: 'retikz-keyword_relative',
  /** 相对偏移 type：累积（TikZ `(++x,++y)`），每段更新 prevEnd */
  Accumulate: 'retikz-keyword_accumulate',
} as const;

/** way 折角算子字面量类型 */
export type WayVia = typeof DrawWay.Hv | typeof DrawWay.Vh | typeof DrawWay.Hvh | typeof DrawWay.Vhv;

/** 可配置的三段折角 Way 算子 */
export type WayFoldOp = {
  /** 三段折角走向 */
  via: typeof DrawWay.Hvh | typeof DrawWay.Vhv;
  /** 中间腿的归一化位置 */
  fraction?: number;
};

/** way 闭合关键字字面量类型 */
export type WayCycle = typeof DrawWay.Cycle;

/**
 * 相对偏移 way item（sugar，TS-friendly），与字符串 `'+dx,dy'`/`'++dx,dy'` 等价
 * @description 以前一 step 终点为基准（首项回退 [0,0]）；Relative 不更新 prevEnd，Accumulate 累积更新。对象形态便于 IDE 补全字段；parseWay 在 sugar 层就地翻译为 IR `{relative}`/`{relativeAccumulate}`
 */
export type WayRelativeItem = {
  /** 以前一段终点为基准的水平与垂直偏移 */
  position: [number, number];
  /** 选择只偏移当前目标，或同时推进后续目标的累计基点 */
  type: typeof DrawWay.Relative | typeof DrawWay.Accumulate;
};

/** 二次贝塞尔算子（infix）：把"上一项→下一项"段改成 curve step，curve 字段携控制点 */
export type WayCurveOp<TControl = IRControlPoint> = {
  /** 上一目标与下一目标之间的二次贝塞尔控制点 */
  curve: TControl;
};

/** 三次贝塞尔算子（infix）：cubic step；cubic 字段携两个控制点 */
export type WayCubicOp<TControl = IRControlPoint> = {
  /** 从上一目标到下一目标依次使用的两个三次贝塞尔控制点 */
  cubic: [TControl, TControl];
};

/** 弧形简记算子（infix）：bend step；bend=方向，angle 可选缺省 30° */
export type WayBendOp = {
  /** 相对行进方向选择左弯或右弯 */
  bend: 'left' | 'right';
  /**
   * bend 角度（度）
   * @default 30
   */
  angle?: number;
};

/**
 * 弧段算子（infix），以上一项为圆心
 * @description 按起末角度 + 半径画弧；与 curve/fold infix 不同——只消耗前一 target 作圆心，不与下一项合并
 */
export type WayArcOp = {
  /** 以上一目标为圆心的圆弧参数 */
  arc: {
    /** 圆弧起始角，单位为度 */
    startAngle: number;
    /** 圆弧终止角，单位为度 */
    endAngle: number;
    /** 圆弧半径，支持统一或分轴半径 */
    radius: IRStepRadius;
  };
};

/** 整圆算子（infix），以上一项为圆心、给定半径画整圆，pen 留圆心 */
export type WayCircleOp = {
  /** 以上一目标为圆心绘制整圆的参数 */
  circle: {
    /** 整圆半径，使用绘图坐标单位 */
    radius: number;
  };
};

/** 整椭圆算子（infix），以上一项为圆心、给定 x/y 半径画整椭圆，pen 留圆心 */
export type WayEllipseOp = {
  /** 以上一目标为中心绘制整椭圆的参数 */
  ellipse: {
    /** 椭圆沿水平轴与垂直轴的半径 */
    radius: IRStepAnisotropicRadius;
  };
};

/** 边标注 parser grammar：字符串=`{text:s}`，对象接收可写入 IR 的 canonical side */
export type WayLabel = IRStepLabel | string;

/**
 * 边标注 prefix 算子（infix），修饰下一段
 * @description line/fold/curve/cubic/bend/arc/circle/ellipse 都可承载；下一个产生段的 way item 消耗到自己的 step.label 上。cycle 不允许挂 label；连续 label/末尾未消费 label 均抛错
 */
export type WayLabelOp = {
  /** 应用于后续绘制段的标签文字或配置 */
  label: WayLabel;
};

/** 单轴连接算子：把目标投影到当前 host 的水平或垂直轴 */
export type WayAxisLineOp<TAxisTarget = IRAxisLineTarget> =
  | {
      /** 提供水平连接终点横坐标的目标 */
      horizontalTo: TAxisTarget | string;
    }
  | {
      /** 提供垂直连接终点纵坐标的目标 */
      verticalTo: TAxisTarget | string;
    };

/**
 * Sugar 层 way 数组 DSL 元素
 * @description 节点 id 字符串/笛卡尔/极坐标 → line（首项 move）；`{position,type}` 相对偏移对象 → IR relative/relativeAccumulate；horizontalTo/verticalTo → axis-line；四种裸 via 或 `{via,fraction}` 与下一项合并 fold；DrawWay.Cycle → cycle；curve/cubic/bend infix 与下一项合并；arc/circle/ellipse infix 以上一项为圆心不消耗下一项。Cycle/Relative/Accumulate 底层字符串刻意写丑避节点 id 撞结构
 */
export type WayItem<TTarget = IRTarget, TControl = IRControlPoint, TAxisTarget = IRAxisLineTarget> =
  | TTarget
  // 节点 id / anchor / 角度 / 相对偏移字符串 shorthand（React DSL 层）——core IRTarget 已对象化，way 仍接受字符串、parseTargetSugar eager 转对象
  | string
  | WayRelativeItem
  | WayVia
  | WayFoldOp
  | WayCycle
  | WayCurveOp<TControl>
  | WayCubicOp<TControl>
  | WayBendOp
  | WayArcOp
  | WayCircleOp
  | WayEllipseOp
  | WayLabelOp
  | WayAxisLineOp<TAxisTarget>;

/** way DSL 数组：sugar `<Draw way={...}>` 输入形态 */
export type WayDSL<TTarget = IRTarget, TControl = IRControlPoint, TAxisTarget = IRAxisLineTarget> = Array<
  WayItem<TTarget, TControl, TAxisTarget>
>;

const normalizeLabel = (label: WayLabel): IRStepLabel => (typeof label === 'string' ? { text: label } : label);

/** 统一路径语法的位置适配契约；适配器不执行几何或数据求值 */
export type WayTargetAdapter<TTarget, TControl, TAxisTarget> = {
  /** 普通目标与目标简写 */
  target: (value: TTarget | string | WayRelativeItem) => TTarget;
  /** 贝塞尔绝对控制点 */
  control: (value: TControl) => TControl;
  /** 单轴步骤目标 */
  axisTarget: (value: TAxisTarget | string) => TAxisTarget;
};

/** 语法产物沿用 Core 步骤字段，只替换位置槽 */
export type WayParsedStep<TTarget, TControl, TAxisTarget> =
  | (Omit<IRMoveStep, 'to'> & { to: TTarget })
  | (Omit<IRLineStep, 'to'> & { to: TTarget })
  | (Omit<IRAxisLineStep, 'to'> & { to: TAxisTarget })
  | (Omit<Extract<IRFoldStep, { via: '-|' | '|-' }>, 'to'> & { to: TTarget })
  | (Omit<Extract<IRFoldStep, { via: '-|-' | '|-|' }>, 'to'> & { to: TTarget })
  | (Omit<IRCurveStep, 'to' | 'control'> & { to: TTarget; control: TControl })
  | (Omit<IRCubicStep, 'to' | 'control1' | 'control2'> & { to: TTarget; control1: TControl; control2: TControl })
  | (Omit<IRBendStep, 'to'> & { to: TTarget })
  | IRArcStep
  | IRCirclePathStep
  | IREllipsePathStep
  | Extract<IRStep, { kind: 'cycle' }>;

const WayFoldOpSchema = strictObject({
  via: zodEnum([FoldStepVia.HorizontalVerticalHorizontal, FoldStepVia.VerticalHorizontalVertical]),
  fraction: NormalizedFractionSchema.optional(),
});

/**
 * 将同一套 way 算子语法归约为保留领域位置的步骤
 * @description 领域目标不能使用保留算子字段；目标适配不改变算子顺序与标签消费规则
 */
export const parseWayWithTargets = <TTarget, TControl, TAxisTarget>(
  way: WayDSL<TTarget, TControl, TAxisTarget>,
  adapter: WayTargetAdapter<TTarget, TControl, TAxisTarget>,
): Array<WayParsedStep<TTarget, TControl, TAxisTarget>> => {
  type Item = WayItem<TTarget, TControl, TAxisTarget>;
  const fail = (message: string): never => {
    throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, `parseWay: ${message}`);
  };
  const operator = (item: Item): string | undefined => {
    if (item === DrawWay.Cycle) return 'cycle';
    if (item === DrawWay.Hv || item === DrawWay.Vh || item === DrawWay.Hvh || item === DrawWay.Vhv) return 'via';
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return undefined;
    const names = [
      'horizontalTo',
      'verticalTo',
      'via',
      'label',
      'curve',
      'cubic',
      'bend',
      'arc',
      'circle',
      'ellipse',
    ].filter(key => key in item);
    if ('position' in item && 'type' in item && names.length > 0) names.push('relative');
    if (names.length > 1) fail(`object contains multiple Way operators: ${names.join(', ')}`);
    return names[0];
  };
  const target = (item: Item): TTarget => adapter.target(item as TTarget | string | WayRelativeItem);
  if (way.length < 2) fail('way must contain at least 2 items');
  if (operator(way[0]) !== undefined) fail('way[0] must be a target (move start), got operator');
  const output: Array<WayParsedStep<TTarget, TControl, TAxisTarget>> = [
    { type: 'step', kind: 'move', to: target(way[0]) },
  ];
  let pendingLabel: IRStepLabel | undefined;
  for (let index = 1; index < way.length; index += 1) {
    const item = way[index];
    const operation = operator(item);
    if (operation === 'label') {
      if (pendingLabel !== undefined)
        fail(`label operator at index ${index} cannot directly follow another label operator`);
      pendingLabel = normalizeLabel((item as WayLabelOp).label);
      continue;
    }
    const label = pendingLabel === undefined ? {} : { label: pendingLabel };
    if (operation === 'cycle') {
      if (pendingLabel !== undefined) fail(`cycle step cannot carry a label (label operator at index ${index - 1})`);
      output.push({ type: 'step', kind: 'cycle' });
    } else if (operation === 'via' || operation === 'curve' || operation === 'cubic' || operation === 'bend') {
      const operationName =
        operation === 'via'
          ? `via operator '${typeof item === 'string' ? item : (item as WayFoldOp).via}'`
          : 'curve operator';
      if (index + 1 >= way.length) fail(`${operationName} at end of way must be followed by a target`);
      if (operator(way[index + 1]) !== undefined)
        fail(`${operationName} must be followed by a target, got operator/keyword`);
      const to = target(way[++index]);
      if (operation === 'via') {
        if (typeof item === 'string') {
          output.push({ type: 'step', kind: 'fold', via: item as WayVia, to, ...label });
        } else {
          const parsed = WayFoldOpSchema.safeParse(item);
          if (!parsed.success) fail(`invalid fold operator: ${parsed.error.issues[0]?.message ?? 'invalid object'}`);
          output.push({ type: 'step', kind: 'fold', ...parsed.data!, to, ...label });
        }
      } else if (operation === 'curve') {
        output.push({
          type: 'step',
          kind: 'curve',
          to,
          control: adapter.control((item as WayCurveOp<TControl>).curve),
          ...label,
        });
      } else if (operation === 'cubic') {
        const controls = (item as WayCubicOp<TControl>).cubic;
        output.push({
          type: 'step',
          kind: 'cubic',
          to,
          control1: adapter.control(controls[0]),
          control2: adapter.control(controls[1]),
          ...label,
        });
      } else {
        const bend = item as WayBendOp;
        output.push({
          type: 'step',
          kind: 'bend',
          to,
          bendDirection: bend.bend,
          ...(bend.angle === undefined ? {} : { bendAngle: bend.angle }),
          ...label,
        });
      }
    } else if (operation === 'horizontalTo' || operation === 'verticalTo') {
      const axis = item as WayAxisLineOp<TAxisTarget>;
      output.push({
        type: 'step',
        kind: 'axis-line',
        axis: operation === 'horizontalTo' ? 'horizontal' : 'vertical',
        to: adapter.axisTarget('horizontalTo' in axis ? axis.horizontalTo : axis.verticalTo),
        ...label,
      });
    } else if (operation === 'arc') {
      output.push({ type: 'step', kind: 'arc', ...(item as WayArcOp).arc, ...label });
    } else if (operation === 'circle') {
      output.push({ type: 'step', kind: 'circlePath', ...(item as WayCircleOp).circle, ...label });
    } else if (operation === 'ellipse') {
      output.push({ type: 'step', kind: 'ellipsePath', ...(item as WayEllipseOp).ellipse, ...label });
    } else {
      output.push({ type: 'step', kind: 'line', to: target(item), ...label });
    }
    pendingLabel = undefined;
  }
  if (pendingLabel !== undefined) fail('label operator at end of way must be followed by a step');
  return output;
};

/** 将 way 简写解析为 Core 步骤；各领域复用同一语法归约过程 */
export const parseWay = (way: WayDSL): Array<IRStep> =>
  parseWayWithTargets(way, {
    target: value => {
      if (typeof value === 'object' && 'type' in value && 'position' in value) {
        return value.type === DrawWay.Accumulate
          ? { relativeAccumulate: value.position }
          : { relative: value.position };
      }
      return parseTargetSugar(value);
    },
    control: value => value,
    axisTarget: value => {
      const result = AxisLineTargetSchema.safeParse(parseTargetSugar(value));
      if (!result.success)
        throw new RetikzVanillaError(
          RetikzVanillaErrorCode.Normalize,
          'parseWay: axis-line target must resolve to a Cartesian position or NodeTarget; polar, relative, offset, and between targets are not supported',
          { cause: result.error },
        );
      return result.data;
    },
  });
