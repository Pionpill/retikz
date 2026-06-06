import { type CompositeDefinition, type IRChild, type IRScope, defineComposite } from '@retikz/core';
import type { ZodType } from 'zod';
import { type Channel, type ExternalDatasets, type ExternalRow, type Guide, type Mark, type OrdinalScale, PlotCoordinate, PlotMark, PlotScale, type PlotSpec, PlotSpecSchema, type Scale } from '../ir';
import { channelValue, resolveFieldPath } from './field';
import { type GuideContext, lowerGuide } from './guide';
import { DEFAULT_FONT_SIZE, type Margins, type Rect, computePlotArea, computePolarFrame } from './layout';
import { type ColorOf, lowerMark } from './mark';
import { type CoordinateFrame, createCartesianFrame, createPolarFrame } from './project';
import { type ProvenanceContext, rootMeta, tagSourceIndex } from './provenance';
import { type TickSet, resolveOrdinalScale, resolvePositionScale } from './scale';
import { applyTransforms } from './transform';

/** 空刻度集（某维度无 axis 时给 GuideContext 的占位；实际不会被该维度的 guide 触达） */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/**
 * guide 维度 → 定位角色：polar 下 x / angle 都归 angular、y / radius 都归 radial（hybrid 别名）；cartesian 下原样。
 * @description 唯一性检查须按角色（而非裸 dimension 串）判，否则 `dimension:'x'` 与 `'angle'` 会被当成两根轴静默叠画。
 */
const axisRole = (dimension: string, coordinateType: string): string => {
  if (coordinateType === PlotCoordinate.Polar2D) {
    if (dimension === 'angle' || dimension === 'x') return 'angular';
    if (dimension === 'radius' || dimension === 'y') return 'radial';
  }
  return dimension;
};

/**
 * 取 mark 的 x / y 位置通道；sector 无位置通道（角度来自累积界、半径常量）→ undefined
 * @description schema 已保证位置 mark 必填 x/y、sector 用样式-only 编码，故此处仅按 type 区分取值。
 */
const xChannelOf = (mark: Mark): Channel | undefined => (mark.type === PlotMark.Sector ? undefined : mark.encoding.x);
const yChannelOf = (mark: Mark): Channel | undefined => (mark.type === PlotMark.Sector ? undefined : mark.encoding.y);

/**
 * 一根定位角色只画一根轴：重复同角色的 axis（含 hybrid 别名 x≡angle / y≡radius）→ 抛清晰错误。
 * @description 多轴（dual-axis / 上下双轴，靠 placement 区分、副轴可绑不同 scale）是后续非破坏放宽，目前不支持。
 */
const assertUniqueAxisDimension = (guides: Array<Guide>, coordinateType: string): void => {
  const seen = new Set<string>();
  for (const guide of guides) {
    const role = axisRole(guide.dimension, coordinateType);
    if (seen.has(role)) {
      throw new Error(`lowerPlots: duplicate axis for "${role}" role (dimension "${guide.dimension}"); one axis per positional role`);
    }
    seen.add(role);
  }
};

/** 默认整图尺寸（user units）；尺寸是渲染选项、不进 IR */
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 300;

/** lowerPlots 运行时选项：整图尺寸 + label 字号 + margin + provenance 开关（均不进 IR） */
export type LowerPlotsOptions = {
  /** 整图宽（user units），默认 480 */
  width?: number;
  /** 整图高（user units），默认 300 */
  height?: number;
  /** label 字号（估算占位 + 实绘 label 共用），默认 DEFAULT_FONT_SIZE */
  fontSize?: number;
  /** 逐边覆盖自动估算的 margin */
  margin?: Partial<Margins>;
  /** 总开关：开启才写 layer/series meta + 合成 `<plotId>.` 内部 id；关（默认 false）→ 逐字节等价 alpha.4 */
  provenance?: boolean;
  /** 每个 datum Node 写 per-datum 来源 meta（hit-test；O(rows) 增量，蕴含需 provenance 开），默认 false */
  datumProvenance?: boolean;
  /** 数据属性名：把该字段值绑成 `<plotId>.datum.<值>` 的 Node.id（opt-in 可连接；缺字段 / 重复值 fail loud） */
  datumIdField?: string;
};

/** resolveFrame 产物：mark / guide 共用的投影帧 + 已下沉的网格 / 轴层（z-order 由 expand 编排） */
export type ResolvedFrame = {
  /** mark 与 guide 共用的坐标投影帧（cartesian / polar） */
  frame: CoordinateFrame;
  /** 网格层（垫底；grid:true 的 guide 产出） */
  gridLayers: Array<IRScope>;
  /** 轴层（压顶；每根 axis guide 产出） */
  axisLayers: Array<IRScope>;
};

/** resolveFrame 入参：投影 + guide 下沉所需的全部上下文（pure，无副作用，ADR-02 locator 复用同一投影） */
export type ResolveFrameParams = {
  /** plot IR 根节点（取 coordinate / guides） */
  node: PlotSpec;
  /** transform 后的数据行（域推断、guide 刻度同源） */
  rows: Array<ExternalRow>;
  /** 整图宽（user units） */
  width: number;
  /** 整图高（user units） */
  height: number;
  /** label 字号 */
  fontSize: number;
  /** 逐边覆盖自动估算的 margin */
  margin?: Partial<Margins>;
  /** provenance 上下文（开 → guide 层带 `<plotId>.` id + 来源 meta；undefined → alpha.2 行为） */
  provenance?: ProvenanceContext;
};

/**
 * 按坐标系解析出 mark / guide 共用的投影帧 + 下沉 guide 层
 * @description cartesian：x/y 角色绑 x/y scale、走 plotArea + 直线轴；polar：angle/radius 角色、走 polar layout + 弧 / 辐条轴。
 *   抽成纯函数使 mark 下沉与 ADR-02 locator 共用同一投影（杜绝两套投影漂移）；产物与内联版等价。
 */
export const resolveFrame = (params: ResolveFrameParams): ResolvedFrame => {
  const { node, rows, width, height, fontSize, margin, provenance } = params;
  const coordinate = node.coordinate;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));

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
    // 柱 / 面积从 baseline 起：把 baseline 纳入域，保证连续域容得下 baseline（即便所有值同号）
    if (includeBaseline) {
      if (node.marks.some(mark => mark.type === 'interval')) out.push(0);
      // area 的回边贴 baseline（默认 0），把各 area 的 baseline 纳入值域，使 baseline 投影落在 range 内
      for (const mark of node.marks) {
        if (mark.type === 'area') out.push(mark.baseline ?? 0);
      }
    }
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
    // 角向值 ← x、径向值 ← y（坐标系把 x/y 重解释为 angle/radius，正中 (i) 投影整形）
    const angleValues = collectValues(xChannelOf, false, false, true);
    const radiusValues = collectValues(yChannelOf, true, true);

    // guide 维度角色化：angle / x → angular（primary）、radius / y → radial（secondary）；一维一轴
    const guides = node.guides ?? [];
    assertUniqueAxisDimension(guides, coordinate.type);
    const angularAxis = guides.find(guide => guide.dimension === 'angle' || guide.dimension === 'x');
    const radialAxis = guides.find(guide => guide.dimension === 'radius' || guide.dimension === 'y');

    // 角向 scale 的 range = [startAngle, endAngle]，与 outerRadius 无关 → 可先建以取角向标签，供 layout 留白估算。
    // band / point 角向刻度即类别（域驱动、不依赖最终半径），故此处取的标签即最终标签。
    const angleScale = resolvePositionScale(angleScaleDef, angleValues, [coordinate.startAngle, coordinate.endAngle]);
    const angularTicks: TickSet | undefined = angularAxis ? angleScale.ticks(angularAxis.tickCount) : undefined;

    // polar layout：圆心 + outerRadius；有角向轴时为外圈标签预留留白（ADR-01 computePolarFrame，评审 P1）
    const layout = computePolarFrame(
      width,
      height,
      { hasAngularAxis: !!(angularAxis && angularAxis.tickLabels !== false), angularLabels: angularTicks?.labels ?? [] },
      { fontSize, margin },
    );
    const innerRadiusUnits = coordinate.innerRadius * layout.outerRadius;
    // 径向 range = [innerRadius, outerRadius] user units（依赖最终 outerRadius，故在 layout 之后建）
    const radiusScale = resolvePositionScale(radiusScaleDef, radiusValues, [innerRadiusUnits, layout.outerRadius]);
    const radialTicks: TickSet | undefined = radialAxis ? radiusScale.ticks(radialAxis.tickCount) : undefined;
    const polarFrame = createPolarFrame({
      center: layout.center,
      innerRadius: innerRadiusUnits,
      outerRadius: layout.outerRadius,
      startAngle: coordinate.startAngle,
      endAngle: coordinate.endAngle,
      // 连续角轴（linear / time）才段内采样弯弧；分类（band / point）类别间无中间值，走弦
      continuousAngle: angleScaleDef.type === PlotScale.Linear || angleScaleDef.type === PlotScale.Time,
      primary: angleScale,
      secondary: radiusScale,
    });
    frame = polarFrame;

    // guide 下沉：angular（外圆弧 + 圆周刻度 / 标签 + 角向辐条 grid）/ radial（辐条轴 + 同心环 grid），与 mark 同帧
    const guideContext: GuideContext = {
      plotArea: { x: 0, y: 0, width, height },
      projectX: angleScale,
      projectY: radiusScale,
      xTicks: angularTicks ?? EMPTY_TICKS,
      yTicks: radialTicks ?? EMPTY_TICKS,
      fontSize,
      frame: polarFrame,
      angularTicks: angularTicks ?? EMPTY_TICKS,
      radialTicks: radialTicks ?? EMPTY_TICKS,
    };
    for (const guide of guides) {
      const lowered = lowerGuide(guide, guideContext, provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
  } else {
    // cartesian2D：x/y 角色绑 x/y scale
    const xScaleDef = requireScaleDef('x', coordinate.x);
    const yScaleDef = requireScaleDef('y', coordinate.y);
    const xScale = resolvePositionScale(xScaleDef, collectValues(xChannelOf, false, false), [0, width]);
    const yScale = resolvePositionScale(yScaleDef, collectValues(yChannelOf, true, true), [height, 0]);

    // 哪些维度有坐标轴（决定 margin / 是否算 ticks）；alpha.2 guide 仅 axis 类型，按 dimension 取
    const guides = node.guides ?? [];
    assertUniqueAxisDimension(guides, coordinate.type);
    const xAxis = guides.find(guide => guide.dimension === 'x');
    const yAxis = guides.find(guide => guide.dimension === 'y');
    const xTicks: TickSet | undefined = xAxis ? xScale.ticks(xAxis.tickCount) : undefined;
    const yTicks: TickSet | undefined = yAxis ? yScale.ticks(yAxis.tickCount) : undefined;

    // 由整图尺寸 + axis 占位缩出 plot area（无 axis → margin 全 0 → plot area = 整图，向后兼容）
    const { plotArea } = computePlotArea(
      width,
      height,
      { hasXAxis: !!xAxis, hasYAxis: !!yAxis, xLabels: xTicks?.labels ?? [], yLabels: yTicks?.labels ?? [] },
      { fontSize, margin },
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
    const lowered = guides.map(guide => lowerGuide(guide, guideContext, provenance));
    for (const layer of lowered) {
      if (layer.gridLayer) gridLayers.push(layer.gridLayer);
      if (layer.axisLayer) axisLayers.push(layer.axisLayer);
    }
  }

  return { frame, gridLayers, axisLayers };
};

/** 解析某 mark 的 color 编码 → 行→颜色串：常量 value 直用；字段过 ordinal scale（显式引用或自动合成默认配色） */
const makeColorResolver = (node: PlotSpec, rows: Array<ExternalRow>): ((mark: Mark) => ColorOf | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: Mark): ColorOf | undefined => {
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
};

/**
 * 把一个 Plot IR 根节点 + 外部数据下沉成一个 core Scope
 * @description 编排：校验 ref/scale → 收集轴值 → 建归一化 scale → 建投影器（resolveFrame）→ 各 mark 下沉 → 包 localNamespace Scope。
 *   root id → Scope.id（plot-design §8.1）；provenance 开 → 外层 Scope + 各层 / datum 带来源 meta + `<plotId>.` 内部 id。
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

  // provenance 总开关：开 → 构造贯穿上下文（datumProvenance 蕴含需 provenance 开）；关 → undefined（产物逐字节等价 alpha.4）
  const provenance: ProvenanceContext | undefined = options.provenance
    ? {
        plotId: node.id,
        dataReference: node.data.reference,
        datumProvenance: options.datumProvenance ?? false,
        datumIdField: options.datumIdField,
      }
    : undefined;

  // 取数：provenance 开时先打源序标记（symbol 键，跨 transform 存活，供 sourceIndex 回指），再过 transform 管线
  const ingested = provenance ? tagSourceIndex(datasets[node.data.reference]) : datasets[node.data.reference];
  const rows = applyTransforms(ingested, node.transform);

  const { frame, gridLayers, axisLayers } = resolveFrame({
    node,
    rows,
    width,
    height,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    margin: options.margin,
    provenance,
  });

  const resolveColor = makeColorResolver(node, rows);

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  // provenance 开 → 传 markProvenance（plotId / markIndex / datum 开关），各层 / datum 绑 id + 来源 meta
  const markLayers: Array<IRChild> = node.marks
    .map((mark, markIndex) => lowerMark(mark, rows, frame, resolveColor(mark), provenance ? { context: provenance, markIndex } : undefined))
    .filter((layer): layer is IRChild => layer !== null);

  // z-order：所有网格层 → marks → 所有轴层（网格垫底、坐标轴压顶不被数据盖）
  const children: Array<IRChild> = [...gridLayers, ...markLayers, ...axisLayers];

  const base: IRScope = node.id
    ? { type: 'scope', id: node.id, localNamespace: true, children }
    : { type: 'scope', localNamespace: true, children };
  return provenance ? { ...base, meta: rootMeta(provenance.dataReference) } : base;
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
