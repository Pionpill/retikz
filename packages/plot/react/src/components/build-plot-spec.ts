import { Children, Fragment, type ReactNode, isValidElement } from 'react';
import {
  type Coordinate,
  type DataModel,
  type Encoding,
  type ExternalRow,
  type Guide,
  IntervalBoundKind,
  type IntervalBounds,
  type Mark,
  type MarkLabel,
  PLOT_NAMESPACE,
  PlotComposite,
  PlotCoordinate,
  PlotFieldType,
  PlotGuide,
  PlotMark,
  PlotScale,
  type Scale as PlotScaleSpec,
  type PlotSpec,
  PlotTransform,
  type TextChannel,
  type Transform,
} from '@retikz/plot';
import { Axis, type AxisProps, Legend, type LegendProps } from './guides';
import {
  type DatumLabelProps,
  IntervalMark,
  type IntervalMarkProps,
  LinkMark,
  type LinkMarkProps,
  PathMark,
  type PathMarkProps,
  PointMark,
  type PointMarkProps,
  ReferenceMark,
  type ReferenceMarkProps,
  RegionMark,
  type RegionMarkProps,
} from './marks';
import { type PositionScaleType, Scale, type ScaleDimension, type ScaleProps } from './scales';
import { Transform as TransformComponent, type TransformProps } from './transform';

/** 自动建的 scale 名（用户不可见；需要显式 scale 配置时后续再加 <Scale>） */
const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_ANGLE = '__angle';
const AUTO_RADIUS = '__radius';
const AUTO_COLOR = '__color';

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
      /** 该坐标系消费的位置角色序（mark 的 x / y / z 通道） */
      roles: Array<'x' | 'y' | 'z'>;
      /** 透传给工厂的数值参数（如 archHeight）；JSON 安全 */
      params?: Record<string, number>;
    };

/** buildPlotSpec 选项：坐标系选择 + 数据模型 */
export type BuildPlotSpecOptions = {
  /** PlotSpec id：作为整张图的外部 anchor 句柄 */
  id?: string;
  /** PlotSpec intrinsic width：组合场景下每张 plot 自描述面板宽度 */
  width?: number;
  /** PlotSpec intrinsic height：组合场景下每张 plot 自描述面板高度 */
  height?: number;
  /** 坐标系选择（缺省 cartesian2D）；"polar2D" 或 polar2D 对象配置 */
  coordinate?: CoordinateInput;
  /** 数据模型（字段类型）：声明则进 data.model，并对未显式 <Scale> 的位置维度走 type-driven 派生 */
  model?: DataModel;
  /**
   * 直传数据 transform IR（拼到 <Transform> 收集结果之前、自动装配 stack 之前）；与 <Transform> 声明组件共用同一管线。
   * @description 程序化构造 spec 时完全掌控 transform 顺序的入口；含 stack 时同样抑制 mark auto-stack（B4 去重）。
   */
  transforms?: Array<Transform>;
  /** 默认颜色数组：分类 color scale 的 range；无 color 编码的 mark 按图层序取色，`currentColor` 表示继承当前文字颜色 */
  colors?: Array<string>;
  /**
   * 延迟位置 scale 推断：省略未显式声明的位置 scale 绑定，让 lowering 按实际数据字段类型派生。
   * @description 供 `<Plot data>` 入口使用；直接调用 buildPlotSpec 时缺省保持旧的 AUTO linear/band 行为。
   */
  deferPositionScaleInference?: boolean;
};

/** 默认 guide（供 decorateDefaultGuides 复用，薄 <Plot> 本身不补）：x 轴 + y 轴（y 带网格，横线读数值、不过密） */
const DEFAULT_GUIDES: ReadonlyArray<Guide> = [
  { type: PlotGuide.Axis, dimension: 'x' },
  { type: PlotGuide.Axis, dimension: 'y', grid: true },
];

/** 运行时 datum label 解析器（ADR-04）：按 mark id 映射「行 → 自定义标签串」（不进 IR，经 lowerPlots options 注入） */
export type ResolveLabelMap = Record<string, (row: ExternalRow) => string>;

/** buildPlotSpec 收集的 resolveLabel 旁路：以返回的 PlotSpec 为键，供 resolvePlotRuntime 取出注入 options（不进 IR） */
const resolveLabelBySpec = new WeakMap<PlotSpec, ResolveLabelMap>();

/** 取某 PlotSpec 经 buildPlotSpec 收集的 resolveLabel 运行时表（无则 undefined） */
export const resolveLabelOf = (spec: PlotSpec): ResolveLabelMap | undefined => resolveLabelBySpec.get(spec);

/** 收集过程的可变累加器 */
type Collected = {
  marks: Array<Mark>;
  guides: Array<Guide>;
  /** 显式 transform（<Transform> 声明组件收集，按声明序） */
  transforms: Array<Transform>;
  /** mark-prop 自动装配的 stack（<IntervalMark stack> / <IntervalMark angle>）；显式 stack 存在时抑制（B4 去重） */
  autoStacks: Array<Transform>;
  /** 显式声明的位置 scale */
  scales: Array<ScaleProps>;
  /** 按 mark id 收集的运行时 resolveLabel（不进 IR；ADR-04） */
  resolveLabels: ResolveLabelMap;
  /** 是否有 mark 用了颜色（→ 需自动色 scale） */
  colored: boolean;
  /** 用到的 color 字段名集合（→ 配 model 时按字段类型派生 sequential / ordinal） */
  colorFields: Array<string>;
  /** 是否有 <IntervalMark>（→ 角向轴强制 band scale） */
  hasBar: boolean;
  /** 是否有 <IntervalMark>（heatmap → x / y 双轴强制 band scale） */
  hasRect: boolean;
  /** 是否有 <IntervalMark angle> 饼/环图入口（→ 角向 linear scale） */
  hasSector: boolean;
  /** 是否有闭合 <PathMark>（雷达 → 角向 point scale） */
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

/**
 * 把位置 mark 的扁平 label* props 装成 IR MarkLabel（priority-1 宿主 datum label，ADR-04）
 * @description label 顶层 string 默认按字段（content.field）；labelFormat 进 IR；labelPosition / labelDistance / labelPin
 *   摊进对齐 core NodeLabelSchema 的字段。无 label 字段 → undefined（不挂标签）。
 */
const buildMarkLabel = (props: DatumLabelProps): MarkLabel | undefined => {
  const { label, labelFormat, labelPosition, labelDistance, labelPin } = props;
  if (label === undefined) return undefined;
  const content: TextChannel = { field: label, ...(labelFormat !== undefined ? { format: labelFormat } : {}) };
  return {
    content,
    ...(labelPosition !== undefined ? { position: labelPosition } : {}),
    ...(labelDistance !== undefined ? { distance: labelDistance } : {}),
    ...(labelPin ? { pin: true } : {}),
  };
};

/** 收集某 mark 的运行时 resolveLabel（不进 IR）：仅在配了 mark id 时按 id 注册，否则无从命中（与 ADR-04 注入点一致） */
const recordResolveLabel = (into: Collected, id: string | undefined, resolveLabel: ((row: ExternalRow) => string) | undefined): void => {
  if (resolveLabel === undefined) return;
  if (id === undefined) {
    throw new Error('buildPlotSpec: resolveLabel needs a mark id to be injected at runtime; set the mark id prop');
  }
  into.resolveLabels[id] = resolveLabel;
};

/** Axis.scale 只适用于真实位置 scale 维度；ternary x/y/z 没有独立 Scale 声明 */
const isScaleDimension = (dimension: AxisProps['dimension']): dimension is ScaleDimension =>
  dimension === 'x' || dimension === 'y' || dimension === 'angle' || dimension === 'radius';

/** 把 x/y 字段装成位置 encoding（x/y 是唯一位置通道；polar 下坐标系把 x→angle、y→radius 重解释） */
const positionEncoding = (x: string, y: string): Pick<Encoding, 'x' | 'y'> => ({
  x: { field: x },
  y: { field: y },
});

/** rule 扁平 prop → IR 位置通道：数字 → 常量 value、字符串 → 字段 field */
const ruleChannel = (value: number | string): { value: number } | { field: string } => (typeof value === 'number' ? { value } : { field: value });

/**
 * 把 <ReferenceMark> 扁平 props 装配进 rule IR（取向 / band 上界 / extent / color 校验 fail-loud）
 * @description 取向由给 x（竖直）还是 y（水平）决定，二选一（皆给 / 皆缺 → fail-loud）；
 *   band 上界 xTo 须配 x、yTo 须配 y（不匹配 / 单飞 → fail-loud）；extent 须成对（单设 → fail-loud）。
 *   常量 rule（x/y 为数字）→ color 作 value 常量；per-datum rule（x/y 为字段串）→ color 作 field（AUTO_COLOR）。
 */
const collectReference = (props: ReferenceMarkProps, into: Collected): void => {
  const { x, y, xTo, yTo, extentField, extentToField, color, id } = props;
  const hasX = x !== undefined;
  const hasY = y !== undefined;
  if (hasX === hasY) {
    throw new Error('buildPlotSpec: <ReferenceMark> must bind exactly one of x (vertical) or y (horizontal); set one, not both / neither');
  }
  if (hasX && yTo !== undefined) {
    throw new Error('buildPlotSpec: <ReferenceMark> binds x (vertical) but sets yTo; the band upper bound must match the bound dimension (use xTo)');
  }
  if (hasY && xTo !== undefined) {
    throw new Error('buildPlotSpec: <ReferenceMark> binds y (horizontal) but sets xTo; the band upper bound must match the bound dimension (use yTo)');
  }
  if ((extentField === undefined) !== (extentToField === undefined)) {
    throw new Error('buildPlotSpec: <ReferenceMark> extentField / extentToField must be set together (a partial-length span needs both start and end)');
  }
  // 常量 rule（数字常量轴）→ color 作 value；per-datum（字段串）→ color 作 field（AUTO_COLOR）
  const constantRule = typeof (hasX ? x : y) === 'number';
  let colorEnc: { color: { value: string } | { field: string; scale: string } } | undefined;
  if (color !== undefined) {
    colorEnc = constantRule ? { color: { value: color } } : { color: { field: color, scale: AUTO_COLOR } };
  }
  const positional = hasX ? { x: ruleChannel(x) } : { y: ruleChannel(y as number | string) };
  const upper = hasX ? (xTo !== undefined ? { xTo } : {}) : yTo !== undefined ? { yTo } : {};
  into.marks.push({
    type: PlotMark.Reference,
    ...(id !== undefined ? { id } : {}),
    ...upper,
    ...(extentField !== undefined ? { extentField } : {}),
    ...(extentToField !== undefined ? { extentToField } : {}),
    encoding: { ...positional, ...colorEnc },
  });
  // 仅 per-datum color（field）需自动色 scale；常量 color value 直落 IR，不进色 scale
  if (colorEnc && 'field' in colorEnc.color) {
    into.colored = true;
    into.colorFields.push(colorEnc.color.field);
  }
};

/** 递归收集 mark / guide / transform：认 mark/guide 组件，穿透 Fragment，忽略其它节点 */
const collectInto = (children: ReactNode, into: Collected): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectInto((child.props as { children?: ReactNode }).children, into);
      return;
    }
    if (child.type === PathMark) {
      const props = child.props as PathMarkProps;
      const { x, y, order, series, color, closed, id } = props;
      const colorEnc = colorChannel(color, series);
      const markLabel = buildMarkLabel(props);
      into.marks.push({
        type: PlotMark.Path,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(closed ? { closed: true } : {}),
        ...(markLabel !== undefined ? { label: markLabel } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc },
      });
      recordColor(into, colorEnc);
      recordResolveLabel(into, id, props.resolveLabel);
      if (closed) into.hasClosedLine = true;
    } else if (child.type === PointMark) {
      const props = child.props as PointMarkProps;
      const { x, y, z, color, size, opacity, shape, text, format, dx, dy, id } = props;
      const colorEnc = colorChannel(color, undefined);
      const markLabel = buildMarkLabel(props);
      // text 设 → point 下沉为无边框文本 Node（内容走 encoding.text）；否则散点 glyph。位置通道按坐标系角色（x / x/y / x/y/z）
      const textEnc: { text: TextChannel } | undefined = text !== undefined ? { text: { field: text, ...(format !== undefined ? { format } : {}) } } : undefined;
      into.marks.push({
        type: PlotMark.Point,
        ...(id !== undefined ? { id } : {}),
        ...(dx !== undefined ? { dx } : {}),
        ...(dy !== undefined ? { dy } : {}),
        ...(markLabel !== undefined ? { label: markLabel } : {}),
        encoding: {
          ...(x !== undefined ? { x: { field: x } } : {}),
          ...(y !== undefined ? { y: { field: y } } : {}),
          ...(z !== undefined ? { z: { field: z } } : {}),
          ...colorEnc,
          ...(size !== undefined ? { size: { field: size } } : {}),
          ...(opacity !== undefined ? { opacity: { field: opacity } } : {}),
          ...(shape !== undefined ? { shape: { field: shape } } : {}),
          ...textEnc,
        },
      });
      recordColor(into, colorEnc);
      recordResolveLabel(into, id, props.resolveLabel);
    } else if (child.type === IntervalMark) {
      const props = child.props as IntervalMarkProps;
      const { x, y, angle, x0, x1, color, series, stack, bounds: explicitBounds, id } = props;
      const markLabel = buildMarkLabel(props);
      // pie / donut：angle → 自动累积 stack transform（产 y0/y1）+ extent×full bounds
      if (angle !== undefined) {
        if (y !== undefined || x !== undefined || x0 !== undefined || x1 !== undefined || stack !== undefined || explicitBounds !== undefined) {
          throw new Error('buildPlotSpec: <IntervalMark angle> is the polar pie/donut form; do not mix it with x/y/x0/x1/stack/bounds');
        }
        into.autoStacks.push({ kind: PlotTransform.Stack, y: angle, ...(series !== undefined ? { groupBy: series } : {}) });
        const colorEnc = colorChannel(color, series) ?? colorChannel(angle, undefined);
        into.marks.push({
          type: PlotMark.Interval,
          ...(id !== undefined ? { id } : {}),
          bounds: { x: { kind: IntervalBoundKind.Extent, from: 'y0', to: 'y1' }, y: { kind: IntervalBoundKind.Full } },
          encoding: { ...colorEnc },
        });
        into.hasSector = true;
        recordColor(into, colorEnc);
        return;
      }
      // 显式 bounds（heatmap 双 band / 高级）：直接落 IR；band bound → 强制对应轴 band scale
      if (explicitBounds !== undefined) {
        const colorEnc = colorChannel(color, series);
        into.marks.push({
          type: PlotMark.Interval,
          ...(id !== undefined ? { id } : {}),
          ...(series !== undefined ? { series } : {}),
          bounds: explicitBounds,
          ...(markLabel !== undefined ? { label: markLabel } : {}),
          encoding: { ...(x !== undefined ? { x: { field: x } } : {}), ...(y !== undefined ? { y: { field: y } } : {}), ...colorEnc },
        });
        if (explicitBounds.x?.kind === IntervalBoundKind.Band) into.hasBar = true;
        if (explicitBounds.y?.kind === IntervalBoundKind.Band) into.hasRect = true;
        recordColor(into, colorEnc);
        recordResolveLabel(into, id, props.resolveLabel);
        return;
      }
      // histogram：x0/x1 → bounds.x = extent（连续 x，不强制 band）；普通 / 分组 / 堆叠柱：band x
      const histogram = x0 !== undefined && x1 !== undefined;
      if ((x0 === undefined) !== (x1 === undefined)) {
        throw new Error('buildPlotSpec: <IntervalMark> x0 / x1 must be set together for continuous-interval bars');
      }
      if (!histogram && x === undefined) {
        throw new Error('buildPlotSpec: <IntervalMark> requires x for categorical bars, x0/x1 for histogram, or angle for the polar pie/donut form');
      }
      if (y === undefined) {
        throw new Error('buildPlotSpec: <IntervalMark> requires y (the value/height), or use angle for the polar pie/donut form');
      }
      const colorEnc = colorChannel(color, series);
      // series + stack → 堆叠（装 stack transform + bounds.y=extent(y0,y1)）；series 无 stack → dodge（bounds.x=band{group}）
      let bounds: IntervalBounds | undefined;
      if (series !== undefined && stack) {
        into.autoStacks.push({ kind: PlotTransform.Stack, x, y, groupBy: series });
        bounds = { y: { kind: IntervalBoundKind.Extent, from: 'y0', to: 'y1' } };
      } else if (series !== undefined && !histogram) {
        bounds = { x: { kind: IntervalBoundKind.Band, group: series } };
      }
      if (histogram) bounds = { ...(bounds ?? {}), x: { kind: IntervalBoundKind.Extent, from: x0, to: x1 } };
      into.marks.push({
        type: PlotMark.Interval,
        ...(id !== undefined ? { id } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(bounds !== undefined ? { bounds } : {}),
        ...(markLabel !== undefined ? { label: markLabel } : {}),
        // histogram：仅 y（高度），x 来自 x0/x1 区间；普通柱：x（分类 band）+ y（值）
        encoding: histogram ? { y: { field: y }, ...colorEnc } : { x: { field: x }, y: { field: y }, ...colorEnc },
      });
      if (!histogram) into.hasBar = true;
      recordColor(into, colorEnc);
      recordResolveLabel(into, id, props.resolveLabel);
    } else if (child.type === RegionMark) {
      const props = child.props as RegionMarkProps;
      const { x, y, order, series, baseline, closed, color, id } = props;
      const colorEnc = colorChannel(color, series);
      const markLabel = buildMarkLabel(props);
      into.marks.push({
        type: PlotMark.Region,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(baseline !== undefined ? { baseline } : {}),
        ...(closed ? { closed: true } : {}),
        ...(markLabel !== undefined ? { label: markLabel } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc },
      });
      recordColor(into, colorEnc);
      recordResolveLabel(into, id, props.resolveLabel);
      if (closed) into.hasClosedLine = true;
    } else if (child.type === LinkMark) {
      const { sourceX, sourceY, targetX, targetY, value, endWidth, curvature, orientation, color, id } = child.props as LinkMarkProps;
      // 扁平端点 props → 嵌套 IR source/target 字段对；color 走 colorChannel（无 series）
      const colorEnc = colorChannel(color, undefined);
      into.marks.push({
        type: PlotMark.Link,
        ...(id !== undefined ? { id } : {}),
        source: { x: { field: sourceX }, y: { field: sourceY } },
        target: { x: { field: targetX }, y: { field: targetY } },
        value,
        ...(endWidth !== undefined ? { endWidth } : {}),
        ...(curvature !== undefined ? { curvature } : {}),
        ...(orientation !== undefined ? { orientation } : {}),
        encoding: { ...colorEnc },
      });
      recordColor(into, colorEnc);
    } else if (child.type === ReferenceMark) {
      collectReference(child.props as ReferenceMarkProps, into);
    } else if (child.type === Axis) {
      const { dimension, scale, tickCount, tickLabels, grid, id } = child.props as AxisProps;
      if (scale !== undefined) {
        if (!isScaleDimension(dimension)) {
          throw new Error(`buildPlotSpec: <Axis dimension="${dimension}" scale> is not supported; axis scale shortcuts only apply to x/y/angle/radius dimensions`);
        }
        into.scales.push({ dimension, type: scale });
      }
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
    } else if (child.type === Scale) {
      const { dimension, type } = child.props as ScaleProps;
      into.scales.push({ dimension, type });
    } else if (child.type === TransformComponent) {
      // 通用 <Transform kind="..."> 声明：props 即 IR transform op（按声明序进 spec.transform）
      into.transforms.push(child.props as TransformProps);
    }
  });
};

/**
 * 自动 color scale：按 color 字段类型派生（仅 model 已知时）——continuous / temporal → sequential、
 * categorical / 未知 → ordinal（向后兼容存量分类用例）。
 * @description 无 model 时一律 ordinal（运行时按推断当分类调色；连续字段会在 lowering fail-loud，提示声明 model 或显式色阶）。
 *   显式 scheme / diverging / midpoint 经 vanilla IR 全量可用，React 自动表面仅派生默认 sequential。
 */
const buildColorScale = (colorFields: Array<string>, model: DataModel | undefined, colors: Array<string> | undefined): PlotScaleSpec => {
  if (model !== undefined) {
    const typeByField = new Map(model.map(field => [field.name, field.type] as const));
    const anyContinuous = colorFields.some(field => {
      const type = typeByField.get(field);
      return type === PlotFieldType.Continuous || type === PlotFieldType.Temporal;
    });
    if (anyContinuous) return { type: PlotScale.Sequential, name: AUTO_COLOR };
  }
  return { type: PlotScale.Ordinal, name: AUTO_COLOR, ...(colors !== undefined ? { range: colors } : {}) };
};

const buildPositionScale = (name: string, type: PositionScaleType): PlotScaleSpec => {
  if (type === 'time') return { type: PlotScale.Time, name };
  if (type === 'point') return { type: PlotScale.Point, name };
  if (type === 'log') return { type: PlotScale.Log, name };
  if (type === 'sqrt') return { type: PlotScale.Sqrt, name };
  return { type: PlotScale.Linear, name };
};

/** cartesian x scale 类型：含 <IntervalMark> 或 <IntervalMark> → band；否则按 <Scale dimension="x"> 或缺省 linear */
const buildCartesianXScale = (forceBand: boolean, explicit: PositionScaleType | undefined): PlotScaleSpec => {
  if (forceBand && explicit !== undefined) {
    throw new Error('buildPlotSpec: <IntervalMark> (bar / heatmap) requires a band x scale; omit <Scale dimension="x" /> for automatic band inference');
  }
  if (forceBand) return { type: PlotScale.Band, name: AUTO_X };
  return buildPositionScale(AUTO_X, explicit ?? 'linear');
};

/** cartesian y（值轴）scale 类型：含 <IntervalMark>（heatmap 双 band）→ band；否则按 <Scale dimension="y"> 或缺省 linear；log / sqrt 由 lowering L1 守住仅 point/line */
const buildCartesianYScale = (hasRect: boolean, explicit: PositionScaleType | undefined): PlotScaleSpec => {
  if (hasRect && explicit !== undefined) {
    throw new Error('buildPlotSpec: <IntervalMark> (heatmap) requires a band y scale; omit <Scale dimension="y" /> for automatic band inference');
  }
  if (hasRect) return { type: PlotScale.Band, name: AUTO_Y };
  return buildPositionScale(AUTO_Y, explicit ?? 'linear');
};

/**
 * polar 角向 scale 类型推断：IntervalMark angle → linear（连续累积角界）；IntervalMark x/y → band（径向柱分类）；
 *   闭合 line（雷达）→ point（类别落等距点）；否则 linear（极坐标折线）
 */
const buildAngleScale = (collected: Collected, explicit: PositionScaleType | undefined): PlotScaleSpec => {
  if (collected.hasBar && explicit !== undefined) {
    throw new Error('buildPlotSpec: <IntervalMark> in polar coordinates requires a band angle scale; omit <Scale dimension="angle" /> for automatic band inference');
  }
  if (collected.hasSector && explicit !== undefined && explicit !== 'linear') {
    throw new Error('buildPlotSpec: <IntervalMark angle> requires a linear angle scale; omit <Scale dimension="angle" /> or use type="linear"');
  }
  if (explicit !== undefined) return buildPositionScale(AUTO_ANGLE, explicit);
  if (collected.hasSector) return { type: PlotScale.Linear, name: AUTO_ANGLE };
  if (collected.hasBar) return { type: PlotScale.Band, name: AUTO_ANGLE };
  if (collected.hasClosedLine) return { type: PlotScale.Point, name: AUTO_ANGLE };
  return { type: PlotScale.Linear, name: AUTO_ANGLE };
};

type ScaleRole = 'x' | 'y' | 'angle' | 'radius';

type ExplicitScaleMap = Partial<Record<ScaleRole, PositionScaleType>>;

const validScaleDimensionsOf = (coordKind: ReturnType<typeof coordinateTypeOf>): ReadonlyArray<ScaleDimension> => {
  if (coordKind === 'cartesian2D') return ['x', 'y'];
  if (coordKind === 'polar2D') return ['angle', 'radius', 'x', 'y'];
  if (coordKind === 'cartesian1D') return ['x'];
  if (coordKind === 'polar1D') return ['angle', 'x'];
  return [];
};

const scaleRoleOf = (dimension: ScaleDimension, coordKind: ReturnType<typeof coordinateTypeOf>): ScaleRole | undefined => {
  if (coordKind === 'cartesian2D') return dimension === 'x' || dimension === 'y' ? dimension : undefined;
  if (coordKind === 'polar2D') {
    if (dimension === 'angle' || dimension === 'x') return 'angle';
    return 'radius';
  }
  if (coordKind === 'cartesian1D') return dimension === 'x' ? 'x' : undefined;
  if (coordKind === 'polar1D') return dimension === 'angle' || dimension === 'x' ? 'angle' : undefined;
  return undefined;
};

const collectExplicitScales = (declared: Array<ScaleProps>, coordKind: ReturnType<typeof coordinateTypeOf>): ExplicitScaleMap => {
  const out: ExplicitScaleMap = {};
  const valid = validScaleDimensionsOf(coordKind);
  for (const scale of declared) {
    const role = scaleRoleOf(scale.dimension, coordKind);
    if (role === undefined) {
      throw new Error(`buildPlotSpec: ${coordKind} coordinate system does not support scale dimension "${scale.dimension}" (valid dimensions: ${valid.join(', ') || 'none'})`);
    }
    if (out[role] !== undefined) {
      throw new Error(`buildPlotSpec: duplicate scale for "${role}" role (dimension "${scale.dimension}")`);
    }
    out[role] = scale.type;
  }
  return out;
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
 *   guide 规则：薄 Plot 只保留显式 <Axis>/<Legend>（不补默认轴）。默认轴交 <Chart>/decorateDefaultGuides。
 *   产出须等价于手写 PlotSpec（仿 core Sugar = Kernel 等价性）。data 不进 IR，仅存 reference
 */
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: BuildPlotSpecOptions = {}): PlotSpec => {
  const collected: Collected = { marks: [], guides: [], transforms: [], autoStacks: [], scales: [], resolveLabels: {}, colored: false, colorFields: [], hasBar: false, hasRect: false, hasSector: false, hasClosedLine: false };
  collectInto(children, collected);

  // transform 装配序：<Plot transforms> 直传 → <Transform> 收集 → auto-stack（B4 去重）
  // B4 按 stack 签名（x / y / groupBy）去重：仅抑制与某条显式 stack 完全同签名的 auto-stack（那条会二次堆叠），
  // 不同签名的 auto-stack 保留——否则该 mark 仍是 arrangement='stack' 却没有对应 y0/y1，lower 阶段读空累积界出错。
  const explicitTransforms: Array<Transform> = [...(options.transforms ?? []), ...collected.transforms];
  const stackSignature = (transform: Transform): string =>
    transform.kind === PlotTransform.Stack ? JSON.stringify([transform.x ?? null, transform.y, transform.groupBy ?? null]) : '';
  const explicitStackSignatures = new Set(explicitTransforms.filter(transform => transform.kind === PlotTransform.Stack).map(stackSignature));
  const dedupedAutoStacks = collected.autoStacks.filter(autoStack => !explicitStackSignatures.has(stackSignature(autoStack)));
  const transforms: Array<Transform> = [...explicitTransforms, ...dedupedAutoStacks];

  const coordKind = coordinateTypeOf(options.coordinate);
  if (collected.hasSector && coordKind !== 'polar2D') {
    throw new Error('buildPlotSpec: <IntervalMark angle> is only valid under coordinate="polar2D"');
  }
  const explicitScales = collectExplicitScales(collected.scales, coordKind);

  // 有 model 或 Plot 入口要求延迟推断时，未显式声明 <Scale> 的维度省略 AUTO 绑定，交给 expand 按字段类型派生。
  // 直接调用 buildPlotSpec 且无 model 时，沿用 AUTO 绑定 + 默认推断（向后兼容）。
  const shouldDeferPositionScales = options.model !== undefined || options.deferPositionScaleInference === true;
  let coordinate: Coordinate;
  let scales: Array<PlotScaleSpec>;
  if (coordKind === 'polar2D') {
    const polar = toPolarConfig(options.coordinate) as PolarConfig;
    const angleScale = buildAngleScale(collected, explicitScales.angle);
    const radiusScale = buildPositionScale(AUTO_RADIUS, explicitScales.radius ?? 'linear');
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Polar2D,
          ...(explicitScales.angle !== undefined ? { angle: AUTO_ANGLE } : {}),
          ...(explicitScales.radius !== undefined ? { radius: AUTO_RADIUS } : {}),
          startAngle: polar.startAngle,
          endAngle: polar.endAngle,
          innerRadius: polar.innerRadius,
        }
      : { type: PlotCoordinate.Polar2D, angle: AUTO_ANGLE, radius: AUTO_RADIUS, startAngle: polar.startAngle, endAngle: polar.endAngle, innerRadius: polar.innerRadius };
    scales = [
      ...(!shouldDeferPositionScales || explicitScales.angle !== undefined ? [angleScale] : []),
      ...(!shouldDeferPositionScales || explicitScales.radius !== undefined ? [radiusScale] : []),
    ];
  } else if (coordKind === 'cartesian1D') {
    // 单维直线：orientation 取对象配置；单一位置 scale 可由 <Scale dimension="x"> 覆盖（rug 默认 linear、timeline 可 time）
    const orientation = typeof options.coordinate === 'object' && options.coordinate.type === 'cartesian1D' ? options.coordinate.orientation : undefined;
    const xScale = buildCartesianXScale(false, explicitScales.x);
    coordinate = shouldDeferPositionScales
      ? { type: PlotCoordinate.Cartesian1D, ...(explicitScales.x !== undefined ? { x: AUTO_X } : {}), ...(orientation !== undefined ? { orientation } : {}) }
      : { type: PlotCoordinate.Cartesian1D, x: AUTO_X, ...(orientation !== undefined ? { orientation } : {}) };
    scales = !shouldDeferPositionScales || explicitScales.x !== undefined ? [xScale] : [];
  } else if (coordKind === 'polar1D') {
    // 单角向圆周：半径占比 + 角向区间取对象配置；角向 scale 默认 linear（无 model；周期连续量）
    const cfg = typeof options.coordinate === 'object' && options.coordinate.type === 'polar1D' ? options.coordinate : undefined;
    const geom = {
      ...(cfg?.radius !== undefined ? { radius: cfg.radius } : {}),
      ...(cfg?.startAngle !== undefined ? { startAngle: cfg.startAngle } : {}),
      ...(cfg?.endAngle !== undefined ? { endAngle: cfg.endAngle } : {}),
    };
    const angleScale = buildPositionScale(AUTO_ANGLE, explicitScales.angle ?? 'linear');
    coordinate = shouldDeferPositionScales ? { type: PlotCoordinate.Polar1D, ...(explicitScales.angle !== undefined ? { angle: AUTO_ANGLE } : {}), ...geom } : { type: PlotCoordinate.Polar1D, angle: AUTO_ANGLE, ...geom };
    scales = !shouldDeferPositionScales || explicitScales.angle !== undefined ? [angleScale] : [];
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
    const xScale = buildCartesianXScale(collected.hasBar || collected.hasRect, explicitScales.x);
    const yScale = buildCartesianYScale(collected.hasRect, explicitScales.y);
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Cartesian2D,
          ...(explicitScales.x !== undefined ? { x: AUTO_X } : {}),
          ...(explicitScales.y !== undefined ? { y: AUTO_Y } : {}),
        }
      : { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
    scales = [
      ...(!shouldDeferPositionScales || explicitScales.x !== undefined ? [xScale] : []),
      ...(!shouldDeferPositionScales || explicitScales.y !== undefined ? [yScale] : []),
    ];
  }
  if (collected.colored) scales.push(buildColorScale(collected.colorFields, options.model, options.colors));

  // 薄 Plot：不补默认轴——用户显式 <Axis>/<Legend> 才有 guides。
  //   开箱即用的默认轴 / 网格交给上层 <Chart>（v0.2，复用 decorateDefaultGuides）。
  const explicitAxes = collected.guides.filter(guide => guide.type === PlotGuide.Axis);
  const legends = collected.guides.filter(guide => guide.type === PlotGuide.Legend);
  const guides: Array<Guide> = [...explicitAxes, ...legends];

  const spec: PlotSpec = {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(options.id !== undefined ? { id: options.id } : {}),
    data: options.model ? { reference: dataRef, model: options.model } : { reference: dataRef },
    ...(transforms.length > 0 ? { transform: transforms } : {}),
    scales,
    ...(options.colors !== undefined ? { colors: options.colors } : {}),
    ...(options.width !== undefined ? { width: options.width } : {}),
    ...(options.height !== undefined ? { height: options.height } : {}),
    coordinate,
    marks: collected.marks,
    guides,
  };
  // 旁路记录 resolveLabel（运行时函数、不进 IR）：resolvePlotRuntime 据返回的 spec 取出注入 lowerPlots options
  if (Object.keys(collected.resolveLabels).length > 0) resolveLabelBySpec.set(spec, collected.resolveLabels);
  return spec;
};

/**
 * 给薄 <Plot> 产物补默认坐标轴：cartesian2D 且无任何显式 axis 时，前置 x 轴 + y 轴（带网格）。
 * @description 框架无关纯函数（PlotSpec 进出），供上层 <Chart>（v0.2）复用——薄 <Plot> 本身不调用。
 *   非 cartesian2D（polar / 1D / ternary）的专门轴仍需显式声明，原样返回；已有显式 <Axis> 时不补。
 */
export const decorateDefaultGuides = (spec: PlotSpec): PlotSpec => {
  if (spec.coordinate.type !== PlotCoordinate.Cartesian2D) return spec;
  const guides = spec.guides ?? [];
  if (guides.some(guide => guide.type === PlotGuide.Axis)) return spec;
  return { ...spec, guides: [...DEFAULT_GUIDES, ...guides] };
};
