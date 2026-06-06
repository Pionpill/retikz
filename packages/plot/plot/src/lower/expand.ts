import { type CompositeDefinition, type IRChild, type IRScope, defineComposite } from '@retikz/core';
import type { ZodType } from 'zod';
import { type Channel, type ExternalDatasets, type Guide, type Mark, type OrdinalScale, PlotCoordinate, PlotScale, type PlotSpec, PlotSpecSchema, type Scale } from '../ir';
import { channelValue, resolveFieldPath } from './field';
import { type GuideContext, lowerGuide } from './guide';
import { DEFAULT_FONT_SIZE, type Margins, type Rect, computePlotArea, computePolarFrame } from './layout';
import { type ColorOf, lowerMark } from './mark';
import { type CoordinateFrame, createCartesianFrame, createPolarFrame } from './project';
import { type TickSet, resolveOrdinalScale, resolvePositionScale } from './scale';
import { applyTransforms } from './transform';

/** 空刻度集（某维度无 axis 时给 GuideContext 的占位；实际不会被该维度的 guide 触达） */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/**
 * 一根定位维度只画一根轴：重复同 dimension 的 axis → 刻度数不确定，抛清晰错误。
 * @description 多轴（dual-axis / 上下双轴，靠 placement 区分、副轴可绑不同 scale）是后续非破坏放宽，目前不支持。
 */
const assertUniqueAxisDimension = (guides: Array<Guide>): void => {
  const seen = new Set<string>();
  for (const guide of guides) {
    if (seen.has(guide.dimension)) {
      throw new Error(`lowerPlots: duplicate axis for dimension "${guide.dimension}"; one axis per dimension`);
    }
    seen.add(guide.dimension);
  }
};

/** 默认整图尺寸（user units）；尺寸是渲染选项、不进 IR */
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 300;

/** lowerPlots 运行时选项：整图尺寸 + label 字号 + margin（均不进 IR） */
export type LowerPlotsOptions = {
  /** 整图宽（user units），默认 480 */
  width?: number;
  /** 整图高（user units），默认 300 */
  height?: number;
  /** label 字号（估算占位 + 实绘 label 共用），默认 DEFAULT_FONT_SIZE */
  fontSize?: number;
  /** 逐边覆盖自动估算的 margin */
  margin?: Partial<Margins>;
};

/**
 * 把一个 Plot IR 根节点 + 外部数据下沉成一个 core Scope
 * @description 编排：校验 ref/scale → 收集轴值 → 建归一化 scale → 建投影器 → 各 mark 下沉 → 包 localNamespace Scope（root id → Scope.id，plot-design §8.1）
 */
const expandPlot = (node: PlotSpec, datasets: ExternalDatasets, options: LowerPlotsOptions): IRChild => {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  // 绘图区尺寸是 scale range / 投影的单一来源；非有限或非正数会一路污染出 cx="NaN" 等坏坐标——入口抛清晰错误
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`lowerPlots: width must be a positive finite number, got ${width}`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`lowerPlots: height must be a positive finite number, got ${height}`);
  }

  if (!(node.data.reference in datasets)) {
    throw new Error(`lowerPlots: dataset "${node.data.reference}" not found in provided datasets`);
  }
  // 取数后先过 transform 管线（sort / stack…）：域推断与 mark 下沉都用变换后的行
  const rows = applyTransforms(datasets[node.data.reference], node.transform);

  const coordinate = node.coordinate;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;

  // 收集某角色（位置 scale 名 + 通道角色）下所有 mark 的通道原始值（不预过滤）：
  //   连续 scale 内部过滤为有限数求 extent、分类 scale 按数据序去重推断 domain。
  // role 决定从哪个通道取值：cartesian 用 x/y；polar 用 angle??x / radius??y（mark 不写死笛卡尔）。
  const collectValues = (
    pick: (mark: Mark) => Channel | undefined,
    includeBaseline: boolean,
    stackAxis: boolean,
    sectorAngle = false,
  ): Array<unknown> => {
    const out: Array<unknown> = [];
    for (const mark of node.marks) {
      // 堆叠柱的 y 域取累积上 / 下界（来自 stack transform），而非每段原值
      if (stackAxis && mark.type === 'interval' && mark.arrangement === 'stack') {
        const y0Field = mark.y0Field ?? 'y0';
        const y1Field = mark.y1Field ?? 'y1';
        for (const row of rows) {
          out.push(resolveFieldPath(row, y0Field), resolveFieldPath(row, y1Field));
        }
        continue;
      }
      // sector mark 的角向域取累积界（来自 stack transform）：[0, total] → [startAngle, endAngle]
      if (sectorAngle && mark.type === 'sector') {
        const startField = mark.startField ?? 'y0';
        const endField = mark.endField ?? 'y1';
        for (const row of rows) {
          out.push(resolveFieldPath(row, startField), resolveFieldPath(row, endField));
        }
        continue;
      }
      const channel = pick(mark);
      if (channel === undefined) continue;
      for (const row of rows) {
        out.push(channelValue(channel, row));
      }
    }
    // 柱从 baseline 0 起：把 0 纳入域，保证连续域容得下 baseline（即便所有值同号）
    if (includeBaseline && node.marks.some(mark => mark.type === 'interval')) out.push(0);
    return out;
  };

  // 解析某角色绑定的 scale 定义；缺失抛清晰错误（沿用 coordinate.x/coordinate.angle 文案）
  const requireScaleDef = (channel: 'x' | 'y' | 'angle' | 'radius', scaleName: string): Scale => {
    const def = scaleByName.get(scaleName);
    if (!def) throw new Error(`lowerPlots: coordinate.${channel} references unknown scale "${scaleName}"`);
    return def;
  };

  // 按坐标系解析出 CoordinateFrame（一次性、mark / guide 共用）+ guide 层。
  // cartesian：x/y 角色绑 x/y scale、走 plotArea + axis guide；polar：angle/radius 角色、走 polar layout（ADR-01 不画 guide）。
  let frame: CoordinateFrame;
  const gridLayers: Array<IRScope> = [];
  const axisLayers: Array<IRScope> = [];

  if (coordinate.type === PlotCoordinate.Polar2D) {
    // 笛卡尔下出现 angle/radius 通道才是误用；polar 下复用 x/y 合法。此处构造极坐标帧。
    const angleScaleDef = requireScaleDef('angle', coordinate.angle);
    const radiusScaleDef = requireScaleDef('radius', coordinate.radius);
    // 角向值 ← angle ?? x；径向值 ← radius ?? y（默认复用 x/y，正中 (i) 投影整形）
    const angleValues = collectValues(mark => mark.encoding.angle ?? mark.encoding.x, false, false, true);
    const radiusValues = collectValues(mark => mark.encoding.radius ?? mark.encoding.y, true, true);
    // polar layout：圆心 + outerRadius（ADR-01 不画角向轴 → 无标签留白）
    const layout = computePolarFrame(width, height, { hasAngularAxis: false, angularLabels: [] }, { fontSize, margin: options.margin });
    const innerRadiusUnits = coordinate.innerRadius * layout.outerRadius;
    // 角向 range = [startAngle, endAngle] 度；径向 range = [innerRadius, outerRadius] user units
    const angleScale = resolvePositionScale(angleScaleDef, angleValues, [coordinate.startAngle, coordinate.endAngle]);
    const radiusScale = resolvePositionScale(radiusScaleDef, radiusValues, [innerRadiusUnits, layout.outerRadius]);
    frame = createPolarFrame({
      center: layout.center,
      innerRadius: innerRadiusUnits,
      outerRadius: layout.outerRadius,
      startAngle: coordinate.startAngle,
      endAngle: coordinate.endAngle,
      primary: angleScale,
      secondary: radiusScale,
    });
  } else {
    // cartesian2D：x/y 角色绑 x/y scale。出现 angle/radius 通道 → reject（误用，多半写错坐标系）
    for (const mark of node.marks) {
      if (mark.encoding.angle !== undefined || mark.encoding.radius !== undefined) {
        throw new Error('lowerPlots: angle / radius channels are only valid under the polar2D coordinate system, not cartesian2D');
      }
    }
    const xScaleDef = requireScaleDef('x', coordinate.x);
    const yScaleDef = requireScaleDef('y', coordinate.y);
    const xScale = resolvePositionScale(xScaleDef, collectValues(mark => mark.encoding.x, false, false), [0, width]);
    const yScale = resolvePositionScale(yScaleDef, collectValues(mark => mark.encoding.y, true, true), [height, 0]);

    // 哪些维度有坐标轴（决定 margin / 是否算 ticks）；alpha.2 guide 仅 axis 类型，按 dimension 取
    const guides = node.guides ?? [];
    assertUniqueAxisDimension(guides);
    const xAxis = guides.find(guide => guide.dimension === 'x');
    const yAxis = guides.find(guide => guide.dimension === 'y');
    const xTicks: TickSet | undefined = xAxis ? xScale.ticks(xAxis.tickCount) : undefined;
    const yTicks: TickSet | undefined = yAxis ? yScale.ticks(yAxis.tickCount) : undefined;

    // 由整图尺寸 + axis 占位缩出 plot area（无 axis → margin 全 0 → plot area = 整图，向后兼容）
    const { plotArea } = computePlotArea(
      width,
      height,
      { hasXAxis: !!xAxis, hasYAxis: !!yAxis, xLabels: xTicks?.labels ?? [], yLabels: yTicks?.labels ?? [] },
      { fontSize, margin: options.margin },
    );

    // range 收敛到 plot area（y 屏幕向下，故倒置）；显式 range 的 scale 不覆盖——尊重用户手设
    // 仅连续 scale 可带显式 range（band / point 的 range 始终派生）
    const xHasExplicitRange = xScaleDef.type === PlotScale.Linear && xScaleDef.range !== undefined;
    const yHasExplicitRange = yScaleDef.type === PlotScale.Linear && yScaleDef.range !== undefined;
    if (!xHasExplicitRange) xScale.setRange([plotArea.x, plotArea.x + plotArea.width]);
    if (!yHasExplicitRange) yScale.setRange([plotArea.y + plotArea.height, plotArea.y]);
    frame = createCartesianFrame(xScale, yScale);

    // guide 的轴线/网格框取 scale 的实际 range（而非 margin 算的 plotArea）：无显式 range 时两者相同，
    // 有显式 range 时轴线/网格随实际绘制区走，与刻度/mark 严格对齐（不因显式 range 而错位）
    const [xRangeStart, xRangeEnd] = xScale.range();
    const [yRangeStart, yRangeEnd] = yScale.range();
    const guideFrame: Rect = {
      x: Math.min(xRangeStart, xRangeEnd),
      y: Math.min(yRangeStart, yRangeEnd),
      width: Math.abs(xRangeEnd - xRangeStart),
      height: Math.abs(yRangeEnd - yRangeStart),
    };

    const guideContext: GuideContext = {
      plotArea: guideFrame,
      projectX: xScale,
      projectY: yScale,
      xTicks: xTicks ?? EMPTY_TICKS,
      yTicks: yTicks ?? EMPTY_TICKS,
      fontSize,
    };
    const lowered = guides.map(guide => lowerGuide(guide, guideContext));
    for (const layer of lowered) {
      if (layer.gridLayer) gridLayers.push(layer.gridLayer);
      if (layer.axisLayer) axisLayers.push(layer.axisLayer);
    }
  }

  // 解析某 mark 的 color 编码 → 行→颜色串：常量 value 直用；字段过 ordinal scale（显式引用或自动合成默认配色）
  const resolveColor = (mark: Mark): ColorOf | undefined => {
    const channel = mark.encoding.color;
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const constant = String(channel.value);
      return () => constant;
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
    let ordinalDef: OrdinalScale | undefined;
    if (channel.scale !== undefined) {
      const def = scaleByName.get(channel.scale);
      if (!def) throw new Error(`lowerPlots: color channel references unknown scale "${channel.scale}"`);
      if (def.type !== PlotScale.Ordinal) {
        throw new Error(`lowerPlots: color channel scale "${channel.scale}" must be an ordinal scale`);
      }
      ordinalDef = def;
    }
    const ordinal = resolveOrdinalScale(
      ordinalDef,
      rows.map(row => resolveFieldPath(row, field)),
    );
    return row => {
      const value = resolveFieldPath(row, field);
      return typeof value === 'string' || typeof value === 'number' ? ordinal(value) : undefined;
    };
  };

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  const markLayers: Array<IRChild> = node.marks
    .map(mark => lowerMark(mark, rows, frame, resolveColor(mark)))
    .filter((layer): layer is IRChild => layer !== null);

  // z-order：所有网格层 → marks → 所有轴层（网格垫底、坐标轴压顶不被数据盖）
  const children: Array<IRChild> = [...gridLayers, ...markLayers, ...axisLayers];

  return node.id
    ? { type: 'scope', id: node.id, localNamespace: true, children }
    : { type: 'scope', localNamespace: true, children };
};

/**
 * 构造 plot 的 Tier 2 下沉逻辑，供 core `CompileOptions.composites` 注入
 * @description 数据闭进函数、不进 IR；返回的 CompositeDefinition 把 plot composite 节点展开成 core Scope/Node/Path
 */
export const lowerPlots = (
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
): Array<CompositeDefinition> => [
  defineComposite({
    // coordinate 的 startAngle/endAngle/innerRadius 带 .default()，使 schema 的 _input ≠ _output（默认值前后差），
    // 与 core `CompositeDefinition.schema: ZodType<T>`（要求 input=output=T）的不变性冲突；expand 只消费 _output（= PlotSpec），
    // 故按输出类型收窄 schema（运行时 parse 仍正常填默认，纯类型层修不变性）。
    schema: PlotSpecSchema as ZodType<PlotSpec>,
    expand: (node: PlotSpec) => expandPlot(node, datasets, options),
  }),
];
