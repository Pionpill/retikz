import { Children, Fragment, type ReactNode, isValidElement } from 'react';
import {
  type ArrangementType,
  type Coordinate,
  type DataModel,
  type Encoding,
  type Guide,
  type Mark,
  PLOT_NAMESPACE,
  PlotArrangement,
  PlotComposite,
  PlotCoordinate,
  PlotFieldType,
  PlotGuide,
  PlotMark,
  PlotScale,
  type PlotSpec,
  PlotTransform,
  type Scale,
  type Transform,
} from '@retikz/plot';
import { Axis, type AxisProps, Legend, type LegendProps } from './guides';
import {
  AreaMark,
  type AreaMarkProps,
  BarMark,
  type BarMarkProps,
  LineMark,
  type LineMarkProps,
  PointMark,
  type PointMarkProps,
  SectorMark,
  type SectorMarkProps,
} from './marks';

/** 自动建的 scale 名（用户不可见；需要显式 scale 配置时后续再加 <Scale>） */
const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_ANGLE = '__angle';
const AUTO_RADIUS = '__radius';
const AUTO_COLOR = '__color';

/** <Plot scaleX> 可选的连续 x scale 类型（柱状自动 band，故此处不含 band）；log / sqrt 仅 point/line（lowering L1 守卫） */
export type DslScaleX = 'linear' | 'time' | 'point' | 'log' | 'sqrt';

/** <Plot scaleY> 可选的连续 y（值轴）scale 类型；log / sqrt 仅 point/line（柱/面积 baseline 0 与之冲突，lowering fail-loud） */
export type DslScaleY = 'linear' | 'log' | 'sqrt';

/**
 * <Plot coordinate> 入口形态：字符串简写或对象配置；缺省 cartesian2D
 * @description 简写 / 判别串与 IR 一致（含维度命名）：polar2D / cartesian1D / polar1D / ternary2D；cartesian2D 为缺省态不必写。
 *   对象形态承载各坐标系几何：polar2D 角向区间 + 环图内半径、cartesian1D 轴向、polar1D 半径占比 + 角向区间、ternary2D 无额外配置。
 */
export type CoordinateInput =
  | 'polar2D'
  | 'cartesian1D'
  | 'polar1D'
  | 'ternary2D'
  | {
      /** 2D 极坐标 */
      type: 'polar2D';
      /** 环图内半径（外半径占比 0..1）；0 = 实心饼 */
      innerRadius?: number;
      /** 角向起始角（度） */
      startAngle?: number;
      /** 角向终止角（度） */
      endAngle?: number;
    }
  | {
      /** 1D 笛卡尔直线 */
      type: 'cartesian1D';
      /** 轴向（horizontal 沿 x、vertical 沿 y）；缺省 horizontal */
      orientation?: 'horizontal' | 'vertical';
    }
  | {
      /** 1D 极坐标圆周 */
      type: 'polar1D';
      /** 圆周半径占可用半径比（0<r≤1）；缺省 1（外圆） */
      radius?: number;
      /** 角向起始角（度）；缺省 0 */
      startAngle?: number;
      /** 角向终止角（度）；缺省 360 */
      endAngle?: number;
    }
  | {
      /** 2D 三元（重心坐标） */
      type: 'ternary2D';
    }
  | {
      /** 自定义坐标系（实验性）：投影由 <Plot coordinates={{ [name]: factory }}> 提供，IR 只存 name + roles + 数值参数 */
      type: 'custom';
      /** 工厂名（对应 <Plot coordinates> 表的键） */
      name: string;
      /** 该坐标系消费的位置角色序（mark 的 x / y / a / b / c 通道） */
      roles: Array<'x' | 'y' | 'a' | 'b' | 'c'>;
      /** 透传给工厂的数值参数（如 archHeight）；JSON 安全 */
      params?: Record<string, number>;
    };

/** buildPlotSpec 选项：bare 开关 + 连续 x scale 类型 + 坐标系选择 */
export type BuildPlotSpecOptions = {
  /** 总开关：不出 guide（plot area = 整图），忽略 <Axis> */
  bare?: boolean;
  /** 连续 x scale 类型（缺省 linear；含 <BarMark> 时强制 band，忽略此项；polar 下忽略） */
  scaleX?: DslScaleX;
  /** 连续 y（值轴）scale 类型（缺省 linear；polar 下忽略）；log / sqrt 仅 point/line（柱/面积 fail-loud） */
  scaleY?: DslScaleY;
  /** 坐标系选择（缺省 cartesian2D）；"polar2D" 或 polar2D 对象配置 */
  coordinate?: CoordinateInput;
  /** 数据模型（字段类型）：声明则进 data.model，并改由 type-driven 派生位置 scale（省略 AUTO 绑定，scaleX / scaleY 让位给 model） */
  model?: DataModel;
};

/** 无任何 <Axis> 子组件时填充的默认 guide：x 轴 + y 轴（y 带网格，横线读数值、不过密） */
const DEFAULT_GUIDES: ReadonlyArray<Guide> = [
  { type: PlotGuide.Axis, dimension: 'x' },
  { type: PlotGuide.Axis, dimension: 'y', grid: true },
];

/** 收集过程的可变累加器 */
type Collected = {
  marks: Array<Mark>;
  guides: Array<Guide>;
  transforms: Array<Transform>;
  /** 是否有 mark 用了颜色（→ 需自动色 scale） */
  colored: boolean;
  /** 用到的 color 字段名集合（→ 配 model 时按字段类型派生 sequential / ordinal） */
  colorFields: Array<string>;
  /** 是否有 <BarMark>（→ 角向轴强制 band scale） */
  hasBar: boolean;
  /** 是否有 <SectorMark>（→ 角向 linear scale） */
  hasSector: boolean;
  /** 是否有闭合 <LineMark>（雷达 → 角向 point scale） */
  hasClosedLine: boolean;
};

/** 颜色字段缺省取 series（分系列即按系列上色）；都无则不着色 */
const colorChannel = (color: string | undefined, series: string | undefined): { color: { field: string; scale: string } } | undefined => {
  const field = color ?? series;
  return field ? { color: { field, scale: AUTO_COLOR } } : undefined;
};

/** 记录某 mark 的 color 编码：置 colored 并收集 color 字段名（供 model 派生 sequential / ordinal） */
const recordColor = (into: Collected, colorEnc: { color: { field: string; scale: string } } | undefined): void => {
  if (!colorEnc) return;
  into.colored = true;
  into.colorFields.push(colorEnc.color.field);
};

/** 把 x/y 字段装成位置 encoding（x/y 是唯一位置通道；polar 下坐标系把 x→angle、y→radius 重解释） */
const positionEncoding = (x: string, y: string): Pick<Encoding, 'x' | 'y'> => ({
  x: { field: x },
  y: { field: y },
});

/** 递归收集 mark / guide / transform：认 mark/guide 组件，穿透 Fragment，忽略其它节点 */
const collectInto = (children: ReactNode, into: Collected): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectInto((child.props as { children?: ReactNode }).children, into);
      return;
    }
    if (child.type === LineMark) {
      const { x, y, order, series, color, closed, id } = child.props as LineMarkProps;
      const colorEnc = colorChannel(color, series);
      into.marks.push({
        type: PlotMark.Line,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(closed ? { closed: true } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc },
      });
      recordColor(into, colorEnc);
      if (closed) into.hasClosedLine = true;
    } else if (child.type === PointMark) {
      const { x, y, a, b, c, color, size, opacity, shape, id } = child.props as PointMarkProps;
      const colorEnc = colorChannel(color, undefined);
      // 位置通道按坐标系角色：cartesian1D-2D / polar 用 x/y、ternary 用 a/b/c；缺角色由 lowering 按坐标系校验
      into.marks.push({
        type: PlotMark.Point,
        ...(id !== undefined ? { id } : {}),
        encoding: {
          ...(x !== undefined ? { x: { field: x } } : {}),
          ...(y !== undefined ? { y: { field: y } } : {}),
          ...(a !== undefined ? { a: { field: a } } : {}),
          ...(b !== undefined ? { b: { field: b } } : {}),
          ...(c !== undefined ? { c: { field: c } } : {}),
          ...colorEnc,
          ...(size !== undefined ? { size: { field: size } } : {}),
          ...(opacity !== undefined ? { opacity: { field: opacity } } : {}),
          ...(shape !== undefined ? { shape: { field: shape } } : {}),
        },
      });
      recordColor(into, colorEnc);
    } else if (child.type === BarMark) {
      const { x, y, color, series, stack, id } = child.props as BarMarkProps;
      const colorEnc = colorChannel(color, series);
      // series + stack → 堆叠（装配 stack transform，x/y/groupBy 与 mark 对齐）；series 无 stack → dodge
      let arrangement: ArrangementType | undefined;
      if (series !== undefined && stack) {
        arrangement = PlotArrangement.Stack;
        into.transforms.push({ kind: PlotTransform.Stack, x, y, groupBy: series });
      } else if (series !== undefined) {
        arrangement = PlotArrangement.Dodge;
      }
      into.marks.push({
        type: PlotMark.Interval,
        ...(id !== undefined ? { id } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(arrangement !== undefined ? { arrangement } : {}),
        encoding: { x: { field: x }, y: { field: y }, ...colorEnc },
      });
      into.hasBar = true;
      recordColor(into, colorEnc);
    } else if (child.type === SectorMark) {
      const { angle, color, series, id } = child.props as SectorMarkProps;
      // 内建自动累积：装单链 stack transform（无分组 x，按 series 排序或数据序）；sector mark 读 y0/y1 为角界
      into.transforms.push({
        kind: PlotTransform.Stack,
        y: angle,
        ...(series !== undefined ? { groupBy: series } : {}),
      });
      // 颜色缺省按 angle 值字段本身分类上色（饼图每片一色）；lowering 的角向域读累积界 y0/y1，不经 encoding，故 encoding 仅承载 color
      const colorEnc = colorChannel(color, series) ?? colorChannel(angle, undefined);
      into.marks.push({
        type: PlotMark.Sector,
        ...(id !== undefined ? { id } : {}),
        encoding: { ...colorEnc },
      });
      into.hasSector = true;
      recordColor(into, colorEnc);
    } else if (child.type === AreaMark) {
      const { x, y, order, series, baseline, closed, color, id } = child.props as AreaMarkProps;
      const colorEnc = colorChannel(color, series);
      into.marks.push({
        type: PlotMark.Area,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(baseline !== undefined ? { baseline } : {}),
        ...(closed ? { closed: true } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc },
      });
      recordColor(into, colorEnc);
      if (closed) into.hasClosedLine = true;
    } else if (child.type === Axis) {
      const { dimension, tickCount, tickLabels, grid, id } = child.props as AxisProps;
      into.guides.push({
        type: PlotGuide.Axis,
        dimension,
        ...(id !== undefined ? { id } : {}),
        ...(tickCount !== undefined ? { tickCount } : {}),
        ...(tickLabels !== undefined ? { tickLabels } : {}),
        ...(grid !== undefined ? { grid } : {}),
      });
    } else if (child.type === Legend) {
      const { channel, scale, title, position, orient, tickCount, tickLabels } = child.props as LegendProps;
      into.guides.push({
        type: PlotGuide.Legend,
        channel,
        ...(scale !== undefined ? { scale } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(orient !== undefined ? { orient } : {}),
        ...(tickCount !== undefined ? { tickCount } : {}),
        ...(tickLabels !== undefined ? { tickLabels } : {}),
      });
    }
  });
};

/**
 * 自动 color scale：按 color 字段类型派生（仅 model 已知时）——continuous / temporal → sequential、
 * categorical / 未知 → ordinal（向后兼容存量分类用例）。
 * @description 无 model 时一律 ordinal（运行时按推断当分类调色；连续字段会在 lowering fail-loud，提示声明 model 或显式色阶）。
 *   显式 scheme / diverging / midpoint 经 vanilla IR 全量可用，React 自动表面仅派生默认 sequential。
 */
const buildColorScale = (colorFields: Array<string>, model: DataModel | undefined): Scale => {
  if (model !== undefined) {
    const typeByField = new Map(model.map(field => [field.name, field.type] as const));
    const anyContinuous = colorFields.some(field => {
      const type = typeByField.get(field);
      return type === PlotFieldType.Continuous || type === PlotFieldType.Temporal;
    });
    if (anyContinuous) return { type: PlotScale.Sequential, name: AUTO_COLOR };
  }
  return { type: PlotScale.Ordinal, name: AUTO_COLOR };
};

/** cartesian x scale 类型：含 <BarMark> → band；否则按 scaleX（缺省 linear） */
const buildCartesianXScale = (hasBar: boolean, scaleX: DslScaleX | undefined): Scale => {
  if (hasBar) return { type: PlotScale.Band, name: AUTO_X };
  if (scaleX === 'time') return { type: PlotScale.Time, name: AUTO_X };
  if (scaleX === 'point') return { type: PlotScale.Point, name: AUTO_X };
  if (scaleX === 'log') return { type: PlotScale.Log, name: AUTO_X };
  if (scaleX === 'sqrt') return { type: PlotScale.Sqrt, name: AUTO_X };
  return { type: PlotScale.Linear, name: AUTO_X };
};

/** cartesian y（值轴）scale 类型：按 scaleY（缺省 linear）；log / sqrt 由 lowering L1 守住仅 point/line */
const buildCartesianYScale = (scaleY: DslScaleY | undefined): Scale => {
  if (scaleY === 'log') return { type: PlotScale.Log, name: AUTO_Y };
  if (scaleY === 'sqrt') return { type: PlotScale.Sqrt, name: AUTO_Y };
  return { type: PlotScale.Linear, name: AUTO_Y };
};

/**
 * polar 角向 scale 类型推断：sector → linear（连续累积角界）；bar → band（径向柱分类）；
 *   闭合 line（雷达）→ point（类别落等距点）；否则 linear（极坐标折线）
 */
const buildAngleScale = (collected: Collected): Scale => {
  if (collected.hasSector) return { type: PlotScale.Linear, name: AUTO_ANGLE };
  if (collected.hasBar) return { type: PlotScale.Band, name: AUTO_ANGLE };
  if (collected.hasClosedLine) return { type: PlotScale.Point, name: AUTO_ANGLE };
  return { type: PlotScale.Linear, name: AUTO_ANGLE };
};

/** polar coordinate IR 的角向区间 / 内半径默认值（与 Polar2DSchema 的 .default() 一致，buildPlotSpec 即填满，等价手写无需再补） */
const POLAR_DEFAULT_START_ANGLE = 0;
const POLAR_DEFAULT_END_ANGLE = 360;
const POLAR_DEFAULT_INNER_RADIUS = 0;

/** coordinate 入口判别串（缺省 cartesian2D）；字符串简写与对象 .type 统一取值 */
const coordinateTypeOf = (input: CoordinateInput | undefined): 'cartesian2D' | 'polar2D' | 'cartesian1D' | 'polar1D' | 'ternary2D' | 'custom' =>
  input === undefined ? 'cartesian2D' : typeof input === 'string' ? input : input.type;

/** 归一化 polar2D coordinate 选项为配置（非 polar2D 返回 undefined），缺省字段填 schema 默认值 */
type PolarConfig = { innerRadius: number; startAngle: number; endAngle: number };
const toPolarConfig = (coordinate: CoordinateInput | undefined): PolarConfig | undefined => {
  if (coordinate === 'polar2D') {
    return { innerRadius: POLAR_DEFAULT_INNER_RADIUS, startAngle: POLAR_DEFAULT_START_ANGLE, endAngle: POLAR_DEFAULT_END_ANGLE };
  }
  if (typeof coordinate === 'object' && coordinate.type === 'polar2D') {
    return {
      innerRadius: coordinate.innerRadius ?? POLAR_DEFAULT_INNER_RADIUS,
      startAngle: coordinate.startAngle ?? POLAR_DEFAULT_START_ANGLE,
      endAngle: coordinate.endAngle ?? POLAR_DEFAULT_END_ANGLE,
    };
  }
  return undefined;
};

/**
 * 把 mark / guide 子组件装配成规范化 PlotSpec
 * @description 纯函数：从 children 收集 mark + guide + transform；按 coordinate（cartesian / polar）推断 scale 类型、
 *   装配 stack transform、自动建坐标系绑定（用户不写）。cartesian：x band/linear/time/point、y linear；
 *   polar：角向 sector→linear / bar→band / 闭合 line→point / 否则 linear，径向 linear。
 *   guide 规则：bare → 无；无 <Axis> → cartesian 默认全套（polar 默认无）；写了 <Axis> → 显式所得。
 *   产出须等价于手写 PlotSpec（仿 core Sugar = Kernel 等价性）。data 不进 IR，仅存 reference
 */
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: BuildPlotSpecOptions = {}): PlotSpec => {
  const collected: Collected = { marks: [], guides: [], transforms: [], colored: false, colorFields: [], hasBar: false, hasSector: false, hasClosedLine: false };
  collectInto(children, collected);

  const coordKind = coordinateTypeOf(options.coordinate);

  // 有 model → 位置 scale 交给 expand 的 type-driven 派生：省略 AUTO 绑定 + 不预生成位置 scale（scaleX 让位给 model）。
  // 无 model → 沿用原 AUTO 绑定 + 推断（向后兼容，存量 DSL 无 model 走此路）。
  const hasModel = options.model !== undefined;
  let coordinate: Coordinate;
  let scales: Array<Scale>;
  if (coordKind === 'polar2D') {
    const polar = toPolarConfig(options.coordinate) as PolarConfig;
    coordinate = hasModel
      ? { type: PlotCoordinate.Polar2D, startAngle: polar.startAngle, endAngle: polar.endAngle, innerRadius: polar.innerRadius }
      : { type: PlotCoordinate.Polar2D, angle: AUTO_ANGLE, radius: AUTO_RADIUS, startAngle: polar.startAngle, endAngle: polar.endAngle, innerRadius: polar.innerRadius };
    scales = hasModel ? [] : [buildAngleScale(collected), { type: PlotScale.Linear, name: AUTO_RADIUS }];
  } else if (coordKind === 'cartesian1D') {
    // 单维直线：orientation 取对象配置；单一位置 scale 复用 scaleX 推断（rug 默认 linear、timeline 可 time）
    const orientation = typeof options.coordinate === 'object' && options.coordinate.type === 'cartesian1D' ? options.coordinate.orientation : undefined;
    coordinate = hasModel
      ? { type: PlotCoordinate.Cartesian1D, ...(orientation !== undefined ? { orientation } : {}) }
      : { type: PlotCoordinate.Cartesian1D, x: AUTO_X, ...(orientation !== undefined ? { orientation } : {}) };
    scales = hasModel ? [] : [buildCartesianXScale(false, options.scaleX)];
  } else if (coordKind === 'polar1D') {
    // 单角向圆周：半径占比 + 角向区间取对象配置；角向 scale 默认 linear（无 model；周期连续量）
    const cfg = typeof options.coordinate === 'object' && options.coordinate.type === 'polar1D' ? options.coordinate : undefined;
    const geom = {
      ...(cfg?.radius !== undefined ? { radius: cfg.radius } : {}),
      ...(cfg?.startAngle !== undefined ? { startAngle: cfg.startAngle } : {}),
      ...(cfg?.endAngle !== undefined ? { endAngle: cfg.endAngle } : {}),
    };
    coordinate = hasModel ? { type: PlotCoordinate.Polar1D, ...geom } : { type: PlotCoordinate.Polar1D, angle: AUTO_ANGLE, ...geom };
    scales = hasModel ? [] : [{ type: PlotScale.Linear, name: AUTO_ANGLE }];
  } else if (coordKind === 'ternary2D') {
    // 三元：coordinate 内自动归一化，无独立位置 scale
    coordinate = { type: PlotCoordinate.Ternary2D };
    scales = [];
  } else if (coordKind === 'custom') {
    // 自定义坐标系：IR 只存 name + roles + 数值参数；投影工厂经 <Plot coordinates> 单独传（运行时函数、不进 IR）。
    // coordKind 'custom' 必来自对象形态（无字符串简写），故 options.coordinate 是 custom 对象。
    const custom = options.coordinate as Extract<CoordinateInput, { type: 'custom' }>;
    coordinate = { type: PlotCoordinate.Custom, name: custom.name, roles: custom.roles, ...(custom.params !== undefined ? { params: custom.params } : {}) };
    scales = [];
  } else {
    coordinate = hasModel ? { type: PlotCoordinate.Cartesian2D } : { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
    scales = hasModel ? [] : [buildCartesianXScale(collected.hasBar, options.scaleX), buildCartesianYScale(options.scaleY)];
  }
  if (collected.colored) scales.push(buildColorScale(collected.colorFields, options.model));

  // 仅 cartesian2D 自动补全 x/y 默认轴；其它坐标系（polar / 1D / ternary）的专门轴需用户显式声明
  const defaultGuides: ReadonlyArray<Guide> = coordKind === 'cartesian2D' ? DEFAULT_GUIDES : [];
  // 默认 axes 合并按 guide type 分判（ADR-03 决策 ⑦，修 P1）：
  //   显式 <Axis> 抑制默认 axes（用户接管坐标轴）；<Legend> 不抑制默认 axes（图例与默认轴共存）。
  //   即：仅当用户未声明任何显式 Axis 时才补默认 axes，无论是否有 Legend。收集到的 Legend 始终保留。
  const explicitAxes = collected.guides.filter(guide => guide.type === PlotGuide.Axis);
  const legends = collected.guides.filter(guide => guide.type === PlotGuide.Legend);
  const guides: Array<Guide> = options.bare ? [] : [...(explicitAxes.length > 0 ? explicitAxes : defaultGuides), ...legends];

  return {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    data: options.model ? { reference: dataRef, model: options.model } : { reference: dataRef },
    ...(collected.transforms.length > 0 ? { transform: collected.transforms } : {}),
    scales,
    coordinate,
    marks: collected.marks,
    guides,
  };
};
