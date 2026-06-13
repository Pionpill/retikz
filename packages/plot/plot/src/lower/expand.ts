import { type CompositeDefinition, type IRChild, type IRNode, type IRScope, defineComposite } from '@retikz/core';
import { type AxisGuide, Cartesian1DOrientation, type Channel, type Coordinate, type ExternalDatasets, type ExternalRow, type Guide, type LegendChannelValue, type LegendGuide, type Mark, type OrdinalScale, PlotCoordinate, PlotFieldType, type PlotFieldTypeValue, PlotGuide, PlotMark, PlotScale, type PlotScaleValue, type PlotSpec, PlotSpecSchema, type QuantileColorScale, type QuantizeColorScale, type Scale, type ThresholdColorScale } from '../ir';
import { channelValue, isFiniteNumber, resolveFieldPath } from './field';
import { type GuideContext, type LegendEntry, type LegendInput, lowerCustomAxis, lowerGuide, lowerLegend } from './guide';
import { DEFAULT_FONT_SIZE, type LegendReserve, type Margins, type Rect, computePlotArea, computePolarFrame, computeTernaryFrame } from './layout';
import { type ColorOf, lowerMark } from './mark';
import { type ChannelResolution, type ScaleDescriptor, makeOpacityResolver, makeShapeResolver, makeSizeResolver } from './channel';
import { type CoordinateFrame, type CustomCoordinateFactory, type DimensionRole, createCartesian1DFrame, createCartesianFrame, createPolar1DFrame, createPolarFrame, createTernary2DFrame } from './project';
import { REQUIRED_POSITION_CHANNELS, VALID_GUIDE_DIMENSIONS } from './coordinate-meta';
import { type DatumIdRegistrar, type ProvenanceContext, createDatumIdRegistrar, rootMeta, tagSourceIndex } from './provenance';
import { type CategoryOrder, type ColorScaleEvaluator, DEFAULT_TICK_COUNT, type TickSet, assertBaselineScaleCompatible, assertScaleFieldCompatible, deriveScale, inferCategoryDomain, orderedCategoryDomain, resolveDivergingColorScale, resolveLinearScale, resolveOrdinalScale, resolvePositionScale, resolveQuantileColorScale, resolveQuantizeColorScale, resolveSequentialColorScale, resolveSqrtScale, resolveThresholdColorScale, sampleSchemeColors, scaleTicks, toTimestamp } from './scale';
import { assertAllValuesValid, collectFormatFields, normalizeRows, validateBoundData } from './coerce';
import { applyTransforms } from './transform';
import { type ResolveField, applyFieldResolver } from './resolve';
import { collectUserSourceFields, resolveFieldTypes } from './validate';

/** 空刻度集（某维度无 axis 时给 GuideContext 的占位；实际不会被该维度的 guide 触达） */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/** 三角轴共享刻度集（占比 0..1，标签为百分数）；三条 a/b/c 轴同域、本轮固定 5 档 */
const TERNARY_TICKS: TickSet = { values: [0, 0.25, 0.5, 0.75, 1], labels: ['0', '25', '50', '75', '100'] };

/**
 * guide 维度 → 定位角色：polar 下 x / angle 都归 angular、y / radius 都归 radial（hybrid 别名）；cartesian 下原样。
 * @description 唯一性检查须按角色（而非裸 dimension 串）判，否则 `dimension:'x'` 与 `'angle'` 会被当成两根轴静默叠画。
 */
const axisRole = (dimension: string, coordinateType: string): string => {
  if (coordinateType === PlotCoordinate.Polar2D || coordinateType === PlotCoordinate.Polar1D) {
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
const assertUniqueAxisDimension = (guides: Array<AxisGuide>, coordinateType: string): void => {
  const seen = new Set<string>();
  for (const guide of guides) {
    const role = axisRole(guide.dimension, coordinateType);
    if (seen.has(role)) {
      throw new Error(`lowerPlots: duplicate axis for "${role}" role (dimension "${guide.dimension}"); one axis per positional role`);
    }
    seen.add(role);
  }
};

/** guide 谓词：按 type 判别串收窄成 axis / legend 子集 */
const isAxisGuide = (guide: Guide): guide is AxisGuide => guide.type === PlotGuide.Axis;
const isLegendGuide = (guide: Guide): guide is LegendGuide => guide.type === PlotGuide.Legend;

/**
 * 按坐标系合法集校验每根 axis guide 的 dimension（ADR-01，修 cross-review P2）
 * @description 非法 dimension（如 cartesian 下 'angle'）从「静默丢弃 / 渲杂散轴线」改 fail-loud，给清晰错误。
 */
/** 坐标系标签（错误信息用）：custom 用 name，内建用 type */
const coordinateLabel = (coordinate: Coordinate): string =>
  coordinate.type === PlotCoordinate.Custom ? `custom coordinate "${coordinate.name}"` : `${coordinate.type} coordinate system`;

/** 该坐标系合法 guide dimension 集：custom 取声明的 roles，内建查 coordinate-meta */
const validGuideDimensionsOf = (coordinate: Coordinate): ReadonlyArray<string> =>
  coordinate.type === PlotCoordinate.Custom ? coordinate.roles : VALID_GUIDE_DIMENSIONS[coordinate.type];

/** 该坐标系必填位置角色集：custom 取声明的 roles，内建查 coordinate-meta */
const requiredPositionChannelsOf = (coordinate: Coordinate): ReadonlyArray<'x' | 'y' | 'a' | 'b' | 'c'> =>
  coordinate.type === PlotCoordinate.Custom ? coordinate.roles : REQUIRED_POSITION_CHANNELS[coordinate.type];

const assertValidGuideDimensions = (coordinate: Coordinate, axisGuides: Array<AxisGuide>): void => {
  const valid = validGuideDimensionsOf(coordinate);
  for (const guide of axisGuides) {
    if (!valid.includes(guide.dimension)) {
      throw new Error(`lowerPlots: ${coordinateLabel(coordinate)} does not support axis dimension "${guide.dimension}" (valid dimensions: ${valid.join(', ')})`);
    }
  }
};

/**
 * 按坐标系必填角色集校验每个位置 mark 的 encoding（ADR-01；x/y 转可选后必填性下放此处）
 * @description sector 无位置通道（角度来自累积界）→ 跳过；其余 mark 缺任一必填角色通道 → fail-loud。
 */
const assertRequiredPositionChannels = (coordinate: Coordinate, marks: ReadonlyArray<Mark>): void => {
  const required = requiredPositionChannelsOf(coordinate);
  for (const mark of marks) {
    if (mark.type === PlotMark.Sector) continue;
    // 读可选位置通道（x/y/a/b/c）；encoding 是 zod object，按名读为 Channel | undefined（纯 JSON 字段，非 any 逃逸）
    const encoding = mark.encoding as Record<string, Channel | undefined>;
    for (const channel of required) {
      if (encoding[channel] === undefined) {
        throw new Error(
          `lowerPlots: ${coordinateLabel(coordinate)} requires the "${channel}" position channel on ${mark.type} marks, but it is missing`,
        );
      }
    }
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
  /** 逻辑字段 → 物理数据路径映射（按数据集 reference 键，不进 IR）；需 data.model；缺省恒等 */
  fieldMaps?: Record<string, Record<string, string>>;
  /** 抽样校验绑定数据（字段缺失 / 不可强制 → fail-loud）；默认关、不 warn */
  validateData?: boolean | { sampleRows?: number };
  /**
   * 非法 / 缺失值策略（运行时、不进 IR）：`'skip'`（默认）归一化写 NaN/undefined 哨兵、不删行，
   * 下游 mark 自跳非法几何；`'error'` 在 transform 之前对 spec 参与字段全量校验，遇任一非法 / 缺失即 fail-loud。
   */
  invalid?: 'skip' | 'error';
  /** 程序化字段解析逃生舱（运行时函数，不进 IR）：按字段名覆盖类型 + 自定义值解析；返回 undefined → 回退 model/推断 + 内置 coerce（ADR-04） */
  resolveField?: ResolveField;
  /**
   * 自定义坐标系工厂表（按 name 查；运行时函数，不进 IR）：spec 的 `coordinate: {type:'custom', name}` 据此解析投影。
   * @description 实验性扩展点——让用户插入任意坐标系几何（曲线一维 / 拱形 x 轴等），无需给坐标系枚举塞成员、也不破坏 IR JSON 化（投影函数留这里，IR 只存 name + roles + 数值参数）。未注册 name → fail-loud。
   */
  coordinates?: Record<string, CustomCoordinateFactory>;
};

/** resolveFrame 产物：mark / guide 共用的投影帧 + 已下沉的网格 / 轴层（z-order 由 expand 编排） */
export type ResolvedFrame = {
  /** mark 与 guide 共用的坐标投影帧（cartesian / polar） */
  frame: CoordinateFrame;
  /** 网格层（垫底；grid:true 的 guide 产出） */
  gridLayers: Array<IRScope>;
  /** 轴层（压顶；每根 axis guide 产出） */
  axisLayers: Array<IRScope>;
  /** 绘图区矩形（已扣 axis margin + legend 预留带）；legend band 据此摆进预留 gutter（ADR-03 占位） */
  plotArea: Rect;
};

/** resolveFrame 入参：投影 + guide 下沉所需的全部上下文（pure，无副作用，ADR-02 locator 复用同一投影） */
export type ResolveFrameParams = {
  /** plot IR 根节点（取 coordinate / guides） */
  node: PlotSpec;
  /** transform 后的数据行（域推断、guide 刻度同源） */
  rows: Array<ExternalRow>;
  /** 用户源字段 → PlotFieldTypeValue（ADR-01 解析）；供 type-driven scale 派生与兼容校验（ADR-03） */
  fieldTypes: Map<string, PlotFieldTypeValue>;
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
  /** 自定义坐标系工厂表（运行时函数，不进 IR）；coordinate {type:'custom', name} 据此解析投影 */
  coordinates?: Record<string, CustomCoordinateFactory>;
};

/**
 * 按坐标系解析出 mark / guide 共用的投影帧 + 下沉 guide 层
 * @description cartesian：x/y 角色绑 x/y scale、走 plotArea + 直线轴；polar：angle/radius 角色、走 polar layout + 弧 / 辐条轴。
 *   抽成纯函数使 mark 下沉与 ADR-02 locator 共用同一投影（杜绝两套投影漂移）；产物与内联版等价。
 */
export const resolveFrame = (params: ResolveFrameParams): ResolvedFrame => {
  const { node, rows, fieldTypes, width, height, fontSize, margin, provenance, coordinates } = params;
  const coordinate = node.coordinate;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));

  // ADR-01 校验（建 frame 前）：guide 维度按坐标系合法集校验 + mark 必填位置角色校验，均 fail-loud。
  assertValidGuideDimensions(coordinate, (node.guides ?? []).filter(isAxisGuide));
  assertRequiredPositionChannels(coordinate, node.marks);

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
      if (stackAxis && mark.type === PlotMark.Interval && mark.arrangement === 'stack') {
        const y0Field = mark.y0Field ?? 'y0';
        const y1Field = mark.y1Field ?? 'y1';
        for (const row of rows) {
          out.push(resolveFieldPath(row, y0Field), resolveFieldPath(row, y1Field));
        }
        continue;
      }
      // sector mark 的角向域取累积界（来自 stack transform）：[0, total] → [startAngle, endAngle]
      if (sectorAngle && mark.type === PlotMark.Sector) {
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
      if (node.marks.some(mark => mark.type === PlotMark.Interval)) out.push(0);
      // area 的回边贴 baseline（默认 0），把各 area 的 baseline 纳入值域，使 baseline 投影落在 range 内
      for (const mark of node.marks) {
        if (mark.type === PlotMark.Area) out.push(mark.baseline ?? 0);
      }
    }
    return out;
  };

  // 某角色（跨所有 mark）绑定字段的全部类型——多 mark 共用一角色时须校验 / 派生全部，不能只看首个
  const roleFieldTypes = (pick: (mark: Mark) => Channel | undefined): Array<PlotFieldTypeValue> => {
    const types: Array<PlotFieldTypeValue> = [];
    for (const mark of node.marks) {
      const channel = pick(mark);
      if (channel?.field === undefined) continue;
      const type = fieldTypes.get(channel.field);
      if (type !== undefined) types.push(type);
    }
    return types;
  };

  // 字段名 → order（来自 data.model，与 fieldTypes 同源）；缺 model / 未声明 order → 无条目
  const fieldOrders = new Map<string, CategoryOrder>();
  for (const field of node.data.model ?? []) {
    if (field.order !== undefined) fieldOrders.set(field.name, field.order);
  }

  /**
   * 解析某 role 的有效 order（解析 + 三道判定的两道：非分类 throw / 冲突 throw）
   * @description 收集该 role 各绑定字段的非默认 order（!=='data'）：非分类字段配 order → throw；
   *   ≥2 个不同非默认 order → throw；恰好 1 个 → 返回它；0 个 → undefined（保持现状出现序）。
   */
  const resolveRoleOrder = (role: string, pick: (mark: Mark) => Channel | undefined): CategoryOrder | undefined => {
    const found: Array<CategoryOrder> = [];
    for (const mark of node.marks) {
      const channel = pick(mark);
      if (channel?.field === undefined) continue;
      const order = fieldOrders.get(channel.field);
      if (order === undefined || order === 'data') continue;
      const type = fieldTypes.get(channel.field);
      if (type !== undefined && type !== PlotFieldType.Categorical) {
        throw new Error(`lowerPlots: field "${channel.field}" has order but its type is ${type}, not categorical; order only applies to categorical fields`);
      }
      found.push(order);
    }
    if (found.length === 0) return undefined;
    const distinct = [...new Set(found.map(order => JSON.stringify(order)))];
    if (distinct.length > 1) {
      throw new Error(`lowerPlots: coordinate.${role} binds fields with conflicting orders; give the scale an explicit domain`);
    }
    return found[0];
  };

  // 解析角色 scale（ADR-03）：显式绑定 → 查表（未声明仍抛，typo 守卫）+ 对该 role **全部**字段做兼容校验；
  //   省略 → 按字段类型派生（要求该 role 字段类型一致，混类型 fail-loud）。兼容校验只对「声明 model 的类型」生效。
  const resolveScaleForRole = (role: 'x' | 'y' | 'angle' | 'radius', scaleName: string | undefined, pick: (mark: Mark) => Channel | undefined, values: Array<unknown>): Scale => {
    const types = roleFieldTypes(pick);
    // 解析该 role 有效 order（含「非分类配 order」「冲突 order」两道 fail-loud），无论 scale 显式与否都先校验
    const order = resolveRoleOrder(role, pick);
    let def: Scale;
    if (scaleName !== undefined) {
      const found = scaleByName.get(scaleName);
      if (!found) throw new Error(`lowerPlots: coordinate.${role} references unknown scale "${scaleName}"`);
      if (node.data.model !== undefined) {
        for (const type of types) assertScaleFieldCompatible(role, found.type, type, scaleName);
      }
      def = found;
    } else {
      const distinct = [...new Set(types)];
      if (distinct.length > 1) {
        throw new Error(`lowerPlots: coordinate.${role} omitted but its bound fields have mixed types [${distinct.join(', ')}]; declare an explicit scale`);
      }
      def = deriveScale(distinct[0], `__${role}`);
    }
    // order 注入：仅当字段有非默认 order 且该 scale 是 band/point 且 domain 未显式给（显式 domain 优先、压过 order）
    if (order !== undefined && (def.type === PlotScale.Band || def.type === PlotScale.Point) && def.domain === undefined) {
      return { ...def, domain: orderedCategoryDomain(values, order) };
    }
    return def;
  };

  // 按坐标系解析出 CoordinateFrame（一次性、mark / guide 共用）+ guide 层。
  // cartesian：x/y 角色绑 x/y scale、走 plotArea + axis guide；polar：angle/radius 角色、走 polar layout（ADR-01 不画 guide）。
  let frame: CoordinateFrame;
  const gridLayers: Array<IRScope> = [];
  const axisLayers: Array<IRScope> = [];
  // legend 预留：按 position 在对应边让出带宽，plotArea 据此收窄（决策 ⑩）
  const legendReserve = legendReserveOf((node.guides ?? []).filter(isLegendGuide));
  // 默认 plotArea = 全画布（polar 用整圆 bbox、不走 plotArea 收窄，legend 占位退化为不收窄）
  let plotArea: Rect = { x: 0, y: 0, width, height };

  if (coordinate.type === PlotCoordinate.Polar2D) {
    // 角向值 ← x、径向值 ← y（坐标系把 x/y 重解释为 angle/radius，正中 (i) 投影整形）
    const angleValues = collectValues(xChannelOf, false, false, true);
    const radiusValues = collectValues(yChannelOf, true, true);
    // 笛卡尔下出现 angle/radius 通道才是误用；polar 下复用 x/y 合法。此处构造极坐标帧。
    const angleScaleDef = resolveScaleForRole('angle', coordinate.angle, xChannelOf, angleValues);
    const radiusScaleDef = resolveScaleForRole('radius', coordinate.radius, yChannelOf, radiusValues);
    // L1：radius 是 polar 的值轴；非线性连续 scale + interval/area（baseline 0）→ fail-loud
    assertBaselineScaleCompatible(radiusScaleDef.type, node.marks);

    // guide 维度角色化：angle / x → angular（primary）、radius / y → radial（secondary）；一维一轴
    const guides = node.guides ?? [];
    const axisGuides = guides.filter(isAxisGuide);
    assertUniqueAxisDimension(axisGuides, coordinate.type);
    const angularAxis = axisGuides.find(guide => guide.dimension === 'angle' || guide.dimension === 'x');
    const radialAxis = axisGuides.find(guide => guide.dimension === 'radius' || guide.dimension === 'y');

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
      // 连续角轴（linear / time / log / pow / sqrt）才段内采样弯弧；分类（band / point）类别间无中间值，走弦
      continuousAngle:
        angleScaleDef.type === PlotScale.Linear ||
        angleScaleDef.type === PlotScale.Time ||
        angleScaleDef.type === PlotScale.Log ||
        angleScaleDef.type === PlotScale.Pow ||
        angleScaleDef.type === PlotScale.Sqrt,
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
    for (const guide of axisGuides) {
      const lowered = lowerGuide(guide, guideContext, provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
  } else if (coordinate.type === PlotCoordinate.Cartesian1D) {
    // cartesian1D：单维（x 角色）落直线，塌缩维取固定基线（horizontal=底、vertical=左）
    const orientation = coordinate.orientation ?? Cartesian1DOrientation.Horizontal;
    const horizontal = orientation === Cartesian1DOrientation.Horizontal;
    const values = collectValues(xChannelOf, false, false);
    const scaleDef = resolveScaleForRole('x', coordinate.x, xChannelOf, values);

    const guides = node.guides ?? [];
    const axisGuides = guides.filter(isAxisGuide);
    assertUniqueAxisDimension(axisGuides, coordinate.type);
    const axis = axisGuides.find(guide => guide.dimension === 'x');

    // provisional range（满画布）求刻度 → 估 plotArea → setRange 收敛到绘图区
    const provisional: [number, number] = horizontal ? [0, width] : [height, 0];
    const scale = resolvePositionScale(scaleDef, values, provisional);
    const ticks: TickSet | undefined = axis ? scale.ticks(axis.tickCount) : undefined;
    const computed = computePlotArea(
      width,
      height,
      {
        hasXAxis: horizontal ? !!axis : false,
        hasYAxis: horizontal ? false : !!axis,
        xLabels: horizontal ? ticks?.labels ?? [] : [],
        yLabels: horizontal ? [] : ticks?.labels ?? [],
        legendReserve,
      },
      { fontSize, margin },
    );
    plotArea = computed.plotArea;
    if (horizontal) scale.setRange([plotArea.x, plotArea.x + plotArea.width]);
    else scale.setRange([plotArea.y + plotArea.height, plotArea.y]);
    // 塌缩维基线：水平贴底边、垂直贴左边（rug 沿轴边缘惯例）
    const baseline = horizontal ? plotArea.y + plotArea.height : plotArea.x;
    frame = createCartesian1DFrame(scale, orientation, baseline);

    // guide：单维直线轴（axisOrientation 覆盖屏幕方向；scale 同时放 projectX/projectY，未用侧忽略）
    const guideContext: GuideContext = {
      plotArea,
      projectX: scale,
      projectY: scale,
      xTicks: horizontal ? ticks ?? EMPTY_TICKS : EMPTY_TICKS,
      yTicks: horizontal ? EMPTY_TICKS : ticks ?? EMPTY_TICKS,
      fontSize,
      axisOrientation: horizontal ? 'horizontal' : 'vertical',
    };
    for (const guide of axisGuides) {
      const lowered = lowerGuide(guide, guideContext, provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
  } else if (coordinate.type === PlotCoordinate.Polar1D) {
    // polar1D：单角向（angle 角色，x 别名）落固定半径圆周，复用 alpha.4 角向投影 + 角向轴
    const radiusFraction = coordinate.radius ?? 1;
    const startAngle = coordinate.startAngle ?? 0;
    const endAngle = coordinate.endAngle ?? 360;
    const angleValues = collectValues(xChannelOf, false, false);
    const angleScaleDef = resolveScaleForRole('angle', coordinate.angle, xChannelOf, angleValues);

    const guides = node.guides ?? [];
    const axisGuides = guides.filter(isAxisGuide);
    assertUniqueAxisDimension(axisGuides, coordinate.type);
    const angularAxis = axisGuides.find(guide => guide.dimension === 'angle' || guide.dimension === 'x');

    // 角向 scale range = [startAngle, endAngle]，与最终半径无关 → 先建取角向标签供 layout 留白
    const angleScale = resolvePositionScale(angleScaleDef, angleValues, [startAngle, endAngle]);
    const angularTicks: TickSet | undefined = angularAxis ? angleScale.ticks(angularAxis.tickCount) : undefined;
    const layout = computePolarFrame(
      width,
      height,
      { hasAngularAxis: !!(angularAxis && angularAxis.tickLabels !== false), angularLabels: angularTicks?.labels ?? [] },
      { fontSize, margin },
    );
    const radius = radiusFraction * layout.outerRadius;
    const continuousAngle =
      angleScaleDef.type === PlotScale.Linear ||
      angleScaleDef.type === PlotScale.Time ||
      angleScaleDef.type === PlotScale.Log ||
      angleScaleDef.type === PlotScale.Pow ||
      angleScaleDef.type === PlotScale.Sqrt;
    frame = createPolar1DFrame({ center: layout.center, radius, startAngle, endAngle, continuousAngle, primary: angleScale });

    // guide：构造 PolarFrame（outerRadius=radius、innerRadius=0）复用 alpha.4 角向轴；secondary 角向轴不用、占位
    const guidePolarFrame = createPolarFrame({
      center: layout.center,
      innerRadius: 0,
      outerRadius: radius,
      startAngle,
      endAngle,
      continuousAngle,
      primary: angleScale,
      secondary: angleScale,
    });
    const guideContext: GuideContext = {
      plotArea: { x: 0, y: 0, width, height },
      projectX: angleScale,
      projectY: angleScale,
      xTicks: angularTicks ?? EMPTY_TICKS,
      yTicks: EMPTY_TICKS,
      fontSize,
      frame: guidePolarFrame,
      angularTicks: angularTicks ?? EMPTY_TICKS,
      radialTicks: EMPTY_TICKS,
    };
    for (const guide of axisGuides) {
      const lowered = lowerGuide(guide, guideContext, provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
  } else if (coordinate.type === PlotCoordinate.Ternary2D) {
    // ternary2D：三连续分量 a/b/c 在 coordinate 内自动归一化 + 重心投影（无独立位置 scale）
    const guides = node.guides ?? [];
    const axisGuides = guides.filter(isAxisGuide);
    assertUniqueAxisDimension(axisGuides, coordinate.type);
    const hasAxis = axisGuides.length > 0;
    const showAnyLabels = axisGuides.some(guide => guide.tickLabels !== false);
    const layout = computeTernaryFrame(width, height, { hasAxis, labels: hasAxis && showAnyLabels ? TERNARY_TICKS.labels : [] }, { fontSize, margin });
    frame = createTernary2DFrame(layout.vertices);

    // 三角轴 guide：projectX/Y 用占位 position scale（三角轴几何走 ternaryVertices、不读位置 scale）
    const placeholderScale = resolvePositionScale({ type: PlotScale.Linear, name: '__ternary', domain: [0, 1] }, [], [0, 1]);
    const guideContext: GuideContext = {
      plotArea: { x: 0, y: 0, width, height },
      projectX: placeholderScale,
      projectY: placeholderScale,
      xTicks: EMPTY_TICKS,
      yTicks: EMPTY_TICKS,
      fontSize,
      ternaryVertices: layout.vertices,
      ternaryTicks: TERNARY_TICKS,
    };
    for (const guide of axisGuides) {
      const lowered = lowerGuide(guide, guideContext, provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
  } else if (coordinate.type === PlotCoordinate.Custom) {
    // 自定义坐标系：投影由运行时工厂提供（IR 只有 name + roles + 数值参数）。本轮仅 point、无自动 guide。
    const factory = coordinates?.[coordinate.name];
    if (!factory) {
      throw new Error(`lowerPlots: custom coordinate "${coordinate.name}" has no registered factory; pass it via lowerPlots options.coordinates (or <Plot coordinates>)`);
    }
    // 按角色取通道值的 picker（custom roles ∈ {x,y,a,b,c}）；供工厂建线性位置 scale
    const pickRole = (role: DimensionRole) => (mark: Mark): Channel | undefined => (mark.type === PlotMark.Sector ? undefined : (mark.encoding as Record<string, Channel | undefined>)[role]);
    const linearScaleFor = (role: DimensionRole, range: [number, number]) =>
      resolvePositionScale({ type: PlotScale.Linear, name: `__custom_${role}` }, collectValues(pickRole(role), false, false), range);
    frame = factory({ width, height, plotArea: { x: 0, y: 0, width, height }, fontSize, params: coordinate.params ?? {}, roles: coordinate.roles, linearScaleFor });
    // 曲线轴：工厂回传 roleScales 时按维度画 path-aware 轴（沿投影采样）；无 roleScales 则不画
    if (frame.type === PlotCoordinate.Custom) {
      const axisGuides = (node.guides ?? []).filter(isAxisGuide);
      assertUniqueAxisDimension(axisGuides, coordinate.type);
      for (const guide of axisGuides) {
        const lowered = lowerCustomAxis(frame, guide, fontSize, provenance);
        if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
        if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
      }
    }
  } else {
    // cartesian2D：x/y 角色绑 x/y scale
    const xValues = collectValues(xChannelOf, false, false);
    const yValues = collectValues(yChannelOf, true, true);
    const xScaleDef = resolveScaleForRole('x', coordinate.x, xChannelOf, xValues);
    const yScaleDef = resolveScaleForRole('y', coordinate.y, yChannelOf, yValues);
    // L1：y 是 cartesian 的值轴；非线性连续 scale + interval/area（baseline 0）→ fail-loud
    assertBaselineScaleCompatible(yScaleDef.type, node.marks);
    const xScale = resolvePositionScale(xScaleDef, xValues, [0, width]);
    const yScale = resolvePositionScale(yScaleDef, yValues, [height, 0]);

    // 哪些维度有坐标轴（决定 margin / 是否算 ticks）；按 type 收窄出 axis 子集，legend 单独走 lowerLegend
    const guides = node.guides ?? [];
    const axisGuides = guides.filter(isAxisGuide);
    assertUniqueAxisDimension(axisGuides, coordinate.type);
    const xAxis = axisGuides.find(guide => guide.dimension === 'x');
    const yAxis = axisGuides.find(guide => guide.dimension === 'y');
    const xTicks: TickSet | undefined = xAxis ? xScale.ticks(xAxis.tickCount) : undefined;
    const yTicks: TickSet | undefined = yAxis ? yScale.ticks(yAxis.tickCount) : undefined;

    // 由整图尺寸 + axis 占位 + legend 预留缩出 plot area（无 axis 且无 legend → margin 全 0 → plot area = 整图，向后兼容）
    const computed = computePlotArea(
      width,
      height,
      { hasXAxis: !!xAxis, hasYAxis: !!yAxis, xLabels: xTicks?.labels ?? [], yLabels: yTicks?.labels ?? [], legendReserve },
      { fontSize, margin },
    );
    plotArea = computed.plotArea;

    // range 收敛到 plot area（y 屏幕向下，故倒置）；显式 range 的 scale 不覆盖——尊重用户手设
    // 仅连续 scale 可带显式 range（band / point 的 range 始终派生；time 的 range 仍派生）
    const hasExplicitContinuousRange = (def: Scale): boolean =>
      (def.type === PlotScale.Linear || def.type === PlotScale.Log || def.type === PlotScale.Pow || def.type === PlotScale.Sqrt) && def.range !== undefined;
    const xHasExplicitRange = hasExplicitContinuousRange(xScaleDef);
    const yHasExplicitRange = hasExplicitContinuousRange(yScaleDef);
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
    const lowered = axisGuides.map(guide => lowerGuide(guide, guideContext, provenance));
    for (const layer of lowered) {
      if (layer.gridLayer) gridLayers.push(layer.gridLayer);
      if (layer.axisLayer) axisLayers.push(layer.axisLayer);
    }
  }

  return { frame, gridLayers, axisLayers, plotArea };
};

/** 解析某 mark 的 color 编码 → 行→颜色串：常量 value 直用；字段过 ordinal scale（显式引用或自动合成默认配色） */
const makeColorResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): ((mark: Mark) => ColorOf | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  // 字段名 → order（与位置通道同源 data.model）：颜色 ordinal 域按字段 order 排，保证位置 / 颜色同序
  const fieldOrders = new Map<string, CategoryOrder>();
  for (const field of node.data.model ?? []) {
    if (field.order !== undefined) fieldOrders.set(field.name, field.order);
  }
  return (mark: Mark): ColorOf | undefined => {
    const channel = mark.encoding.color;
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const constant = String(channel.value);
      return () => constant;
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
    const colorFieldType = fieldTypes.get(field);
    // 连续 / temporal color（alpha.8）：经 sequential / diverging 连续色阶或 quantize / threshold / quantile 离散化色阶 per-datum 取色。
    //   按 datum 取色仅 point / bar(interval) / sector 成立；line / area 是 path 级整体图元，
    //   一条线沿程渐变 / 分箱不做 → fail-loud（守 mark 边界，承 alpha.7 ADR-03）。
    if (colorFieldType === PlotFieldType.Continuous || colorFieldType === PlotFieldType.Temporal) {
      if (mark.type === PlotMark.Line || mark.type === PlotMark.Area) {
        throw new Error(
          `lowerPlots: continuous/temporal color field "${field}" is not supported on ${mark.type} marks (path-level glyph colored per series); continuous color applies to point / bar / sector only`,
        );
      }
      if (channel.scale === undefined) {
        throw new Error(`lowerPlots: continuous/temporal color field "${field}" requires an explicit sequential/diverging/quantize/threshold/quantile color scale reference`);
      }
      const def = scaleByName.get(channel.scale);
      if (!def) throw new Error(`lowerPlots: color channel references unknown scale "${channel.scale}"`);
      const isContinuousColorScale = def.type === PlotScale.Sequential || def.type === PlotScale.Diverging;
      const isDiscretizedColorScale = def.type === PlotScale.Quantize || def.type === PlotScale.Threshold || def.type === PlotScale.Quantile;
      if (!isContinuousColorScale && !isDiscretizedColorScale) {
        throw new Error(`lowerPlots: continuous/temporal color field "${field}" requires a sequential/diverging/quantize/threshold/quantile color scale, but "${channel.scale}" is ${def.type}`);
      }
      // temporal + diverging 无意义（时间无自然中点）→ fail-loud；temporal + sequential 合法（时间戳当连续量）
      if (colorFieldType === PlotFieldType.Temporal && def.type === PlotScale.Diverging) {
        throw new Error(`lowerPlots: temporal color field "${field}" cannot use a diverging color scale (no meaningful midpoint for time); use a sequential color scale`);
      }
      // 取连续数值：temporal 字段过 toTimestamp 转 epoch ms（时间戳当连续量），其余直取有限数
      const toNumber = colorFieldType === PlotFieldType.Temporal ? toTimestamp : (value: unknown): number | null => (isFiniteNumber(value) ? value : null);
      const numericValues = rows.map(row => toNumber(resolveFieldPath(row, field))).filter((value): value is number => value !== null);
      let evaluate: ColorScaleEvaluator;
      switch (def.type) {
        case PlotScale.Sequential:
          evaluate = resolveSequentialColorScale(def, numericValues);
          break;
        case PlotScale.Diverging:
          evaluate = resolveDivergingColorScale(def, numericValues);
          break;
        case PlotScale.Quantize:
          evaluate = resolveQuantizeColorScale(def, numericValues);
          break;
        case PlotScale.Threshold:
          evaluate = resolveThresholdColorScale(def);
          break;
        default:
          evaluate = resolveQuantileColorScale(def, numericValues);
          break;
      }
      return row => {
        const numeric = toNumber(resolveFieldPath(row, field));
        return numeric === null ? undefined : evaluate(numeric);
      };
    }
    // categorical（或类型未知）走 ordinal 离散调色
    let ordinalDef: OrdinalScale | undefined;
    if (channel.scale !== undefined) {
      const def = scaleByName.get(channel.scale);
      if (!def) throw new Error(`lowerPlots: color channel references unknown scale "${channel.scale}"`);
      if (def.type !== PlotScale.Ordinal) {
        throw new Error(`lowerPlots: color channel scale "${channel.scale}" must be an ordinal scale`);
      }
      ordinalDef = def;
    }
    const colorValues = rows.map(row => resolveFieldPath(row, field));
    // 字段有非默认 order 且 ordinal 域未显式给 → 按 order 排 ordinal 域（位置 / 颜色同序）
    const order = fieldOrders.get(field);
    if (order !== undefined && order !== 'data' && ordinalDef?.domain === undefined) {
      ordinalDef = { ...(ordinalDef ?? { type: PlotScale.Ordinal, name: `__color_${field}` }), domain: orderedCategoryDomain(colorValues, order) };
    }
    const ordinal = resolveOrdinalScale(ordinalDef, colorValues);
    return row => {
      const value = resolveFieldPath(row, field);
      return typeof value === 'string' || typeof value === 'number' ? ordinal(value) : undefined;
    };
  };
};

/**
 * 收集所有 mark 在某非位置通道上的字段 descriptor（size / opacity / shape）
 * @description resolver 双产出的 descriptor 注册到 channel → descriptor 表；同通道多 mark 取首个有 descriptor 的
 *   （legend 据 scale name 消歧留待多 scale 场景，alpha.8 这三通道用合成默认 scale，不暴露具名）。
 */
const collectChannelDescriptors = (
  node: PlotSpec,
  resolveSize: (mark: Mark) => ChannelResolution<number> | undefined,
  resolveOpacity: (mark: Mark) => ChannelResolution<number> | undefined,
  resolveShape: (mark: Mark) => ChannelResolution<string> | undefined,
): Map<LegendChannelValue, ScaleDescriptor> => {
  const out = new Map<LegendChannelValue, ScaleDescriptor>();
  const register = (descriptor: ScaleDescriptor | undefined): void => {
    if (descriptor && !out.has(descriptor.channel)) out.set(descriptor.channel, descriptor);
  };
  for (const mark of node.marks) {
    register(resolveSize(mark)?.descriptor);
    register(resolveOpacity(mark)?.descriptor);
    register(resolveShape(mark)?.descriptor);
  }
  return out;
};

/** 数值刻度 nice 化 + 格式化：复用 axis 的 scaleTicks 链（决策 ⑨），domain → {value, offset 0..1, label} */
const niceNumericTicks = (domain: readonly [number, number], count: number): Array<{ value: number; offset: number; label: string }> => {
  const [lo, hi] = domain;
  const scale = resolveLinearScale({ domain: [lo, hi] }, [], [0, 1]);
  const { values, labels } = scaleTicks(scale, count);
  const span = hi - lo;
  return values.map((value, index) => ({
    value: typeof value === 'number' ? value : Number(value),
    offset: span === 0 ? 0.5 : ((typeof value === 'number' ? value : Number(value)) - lo) / span,
    label: labels[index],
  }));
};

/** p 分位（线性插值法）：sortedAscending 已升序，p∈[0,1] */
const quantileAt = (sortedAscending: ReadonlyArray<number>, p: number): number => {
  if (sortedAscending.length === 0) return 0;
  if (sortedAscending.length === 1) return sortedAscending[0];
  const position = p * (sortedAscending.length - 1);
  const lowerIndex = Math.floor(position);
  const fraction = position - lowerIndex;
  const lower = sortedAscending[lowerIndex];
  const upper = sortedAscending[Math.min(lowerIndex + 1, sortedAscending.length - 1)];
  return lower + (upper - lower) * fraction;
};

/**
 * 离散化色阶 → 档色 + 内部边界（legend 分箱用）
 * @description quantize：domain 等宽切；threshold：用户断点；quantile：数据分位。
 *   edges 是档间内部边界（长度 = binCount - 1）；colors 是各档色（range 显式则用、否则从 scheme 采）。
 */
const discretizedBins = (
  def: QuantizeColorScale | ThresholdColorScale | QuantileColorScale,
  values: ReadonlyArray<number>,
): { colors: Array<string>; edges: Array<number> } => {
  if (def.type === PlotScale.Threshold) {
    const edges = [...def.breakpoints];
    const binCount = edges.length + 1;
    const colors = def.range ? [...def.range] : sampleSchemeColors(def.scheme, binCount);
    return { colors, edges };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const binCount = def.range ? def.range.length : def.count ?? 5;
  if (def.type === PlotScale.Quantile) {
    const edges = Array.from({ length: Math.max(0, binCount - 1) }, (_unused, index) => quantileAt(sorted, (index + 1) / binCount));
    const colors = def.range ? [...def.range] : sampleSchemeColors(def.scheme, binCount);
    return { colors, edges };
  }
  // quantize：domain 等宽切
  const lo = def.domain ? def.domain[0] : sorted.length > 0 ? sorted[0] : 0;
  const hi = def.domain ? def.domain[1] : sorted.length > 0 ? sorted[sorted.length - 1] : 1;
  const edges = Array.from({ length: Math.max(0, binCount - 1) }, (_unused, index) => lo + ((index + 1) * (hi - lo)) / binCount);
  const colors = def.range ? [...def.range] : sampleSchemeColors(def.scheme, binCount);
  return { colors, edges };
};

/** legend 专用 sqrt 半径映射：domain [lo, hi]（sqrt 感知）→ range [rMin, rMax]，与 mark size resolver 同核 */
const resolveSqrtForLegend = (domain: readonly [number, number], range: readonly [number, number]): ((value: number) => number) => {
  const scale = resolveSqrtScale({ type: PlotScale.Sqrt, name: '__legend_size', domain: [Math.max(0, domain[0]), domain[1]], range: [range[0], range[1]] }, [], range);
  return value => scale(value);
};

/** legend baseInput 形状（lowerLegend 入参里与求值无关的固定部分） */
type LegendBaseInput = {
  channel: LegendChannelValue;
  position: 'right' | 'left' | 'top' | 'bottom';
  orient: 'vertical' | 'horizontal';
  fontSize: number;
  band: Rect;
  id: string;
};

/** 可作 color 通道的 scale 类型集（位置 scale 不在内）；color legend 绑定外的类型 fail-loud */
const COLOR_SCALE_TYPES = new Set<PlotScaleValue>([PlotScale.Ordinal, PlotScale.Sequential, PlotScale.Diverging, PlotScale.Quantize, PlotScale.Threshold, PlotScale.Quantile]);

/**
 * color legend 解析：定位 color scale（消歧 + fail-loud）→ 按 scale 类型选 swatch / ramp / 分箱
 * @description ordinal → 逐类别色块 swatch；sequential/diverging → core linearGradient 连续色带 ramp + nice 刻度；
 *   quantize/threshold/quantile → 每档区间 swatch（区间标签闭开口契约）。多个 color scale 未消歧 / scale 不存在 → fail-loud。
 */
const resolveColorLegend = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, PlotFieldTypeValue>,
  scaleByName: Map<string, Scale>,
  guide: LegendGuide,
  baseInput: LegendBaseInput,
  showLabels: boolean,
): LegendInput => {
  // 收集被 color 通道引用的 scale 名 + 字段（具名 color scale 已物化进 scales）。
  //   point / bar / sector 都按 datum 着色（ADR-01 B/C），sector（饼 / 环）的 color.field 同样要喂 legend——
  //   scale + field 守卫已兜底无 color 编码的 mark，无需按 mark 类型排除。
  const colorBindings: Array<{ scaleName: string; field: string }> = [];
  for (const mark of node.marks) {
    const channel = mark.encoding.color;
    if (channel?.scale !== undefined && channel.field !== undefined) {
      colorBindings.push({ scaleName: channel.scale, field: channel.field });
    }
  }
  let scaleName: string;
  if (guide.scale !== undefined) {
    if (!scaleByName.has(guide.scale)) {
      throw new Error(`lowerPlots: legend references unknown scale "${guide.scale}"`);
    }
    scaleName = guide.scale;
  } else {
    const distinct = [...new Set(colorBindings.map(binding => binding.scaleName))];
    if (distinct.length === 0) {
      throw new Error('lowerPlots: legend channel "color" has no bound color scale; bind a color encoding with a scale or give the legend an explicit scale');
    }
    if (distinct.length > 1) {
      throw new Error(`lowerPlots: legend channel "color" is driven by multiple color scales [${distinct.join(', ')}]; specify which via the legend "scale" field`);
    }
    scaleName = distinct[0];
  }
  const def = scaleByName.get(scaleName);
  if (!def) throw new Error(`lowerPlots: legend references unknown scale "${scaleName}"`);
  // color legend 只能绑颜色 scale；指向位置 scale（linear/band/point/time/log/pow/sqrt）→ fail-loud，
  //   否则会落空 ordinal 分支出空 / 误导图例（如显式写 scale: 'x'）。
  if (!COLOR_SCALE_TYPES.has(def.type)) {
    throw new Error(
      `lowerPlots: legend channel "color" is bound to scale "${scaleName}" of type "${def.type}", which is not a color scale (expected one of ordinal / sequential / diverging / quantize / threshold / quantile)`,
    );
  }
  const field = colorBindings.find(binding => binding.scaleName === scaleName)?.field;
  // 标题只在用户显式给时渲染（field 名仅作占位 fallback 的语义来源，不自动生成标题 Node，避免与条目标签混淆）
  const title = guide.title;
  const colorFieldType = field !== undefined ? fieldTypes.get(field) : undefined;

  // 连续色带 ramp：sequential / diverging → core linearGradient + nice 刻度
  if (def.type === PlotScale.Sequential || def.type === PlotScale.Diverging) {
    const toNumber = colorFieldType === PlotFieldType.Temporal ? toTimestamp : (value: unknown): number | null => (isFiniteNumber(value) ? value : null);
    const numericValues = field !== undefined ? rows.map(row => toNumber(resolveFieldPath(row, field))).filter((value): value is number => value !== null) : [];
    const evaluate: ColorScaleEvaluator = def.type === PlotScale.Sequential ? resolveSequentialColorScale(def, numericValues) : resolveDivergingColorScale(def, numericValues);
    // ramp 取色 / 刻度域：显式 domain 优先（与实绘取色同基准，避免图例刻度落数据 extent 而颜色按 domain 归一导致错位）；
    //   sequential domain = [min, max]、diverging domain = [low, mid, high] 取 [low, high]；缺省回退数据 extent。
    const dataExtent: [number, number] = numericValues.length === 0 ? [0, 1] : [Math.min(...numericValues), Math.max(...numericValues)];
    const [lo, hi] = def.domain ? [def.domain[0], def.domain[def.domain.length - 1]] : dataExtent;
    // ramp 渐变 stop（沿带等距采样色）+ nice 刻度标签
    const STOP_COUNT = 8;
    const stops = Array.from({ length: STOP_COUNT }, (_unused, index) => {
      const t = index / (STOP_COUNT - 1);
      return { offset: t, color: evaluate(lo + (hi - lo) * t) };
    });
    const ticks = showLabels ? niceNumericTicks([lo, hi], guide.tickCount ?? DEFAULT_TICK_COUNT).map(tick => ({ offset: tick.offset, label: tick.label })) : [];
    return { ...baseInput, form: 'ramp', title, entries: [], ramp: { stops, ticks } };
  }

  // 分箱 swatch：quantize / threshold / quantile → 每档色块 + 区间标签（闭开口：[a, b)，末档闭）
  if (def.type === PlotScale.Quantize || def.type === PlotScale.Threshold || def.type === PlotScale.Quantile) {
    const numericValues = field !== undefined ? rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber) : [];
    const { colors, edges } = discretizedBins(def, numericValues);
    const formatNumber = resolveLinearScale({ domain: edges.length > 0 ? [edges[0], edges[edges.length - 1]] : [0, 1] }, [], [0, 1]).tickFormat();
    const entries: Array<LegendEntry> = colors.map((color, index): LegendEntry => {
      // 区间标签：首档 < e0、末档 ≥ e_last、中间 [e_{i-1}, e_i)
      const lower = index === 0 ? undefined : edges[index - 1];
      const upper = index < edges.length ? edges[index] : undefined;
      const label = !showLabels
        ? ''
        : lower === undefined && upper !== undefined
          ? `< ${formatNumber(upper)}`
          : lower !== undefined && upper === undefined
            ? `≥ ${formatNumber(lower)}`
            : `${formatNumber(lower as number)}–${formatNumber(upper as number)}`;
      return { label, color };
    });
    return { ...baseInput, form: 'swatch', title, entries };
  }

  // ordinal 离散 swatch：每类别一色块 + 类别标签
  const colorValues = field !== undefined ? rows.map(row => resolveFieldPath(row, field)) : [];
  const ordinalDef = def.type === PlotScale.Ordinal ? def : undefined;
  const domain = ordinalDef?.domain ?? inferCategoryDomain(colorValues);
  const ordinal = resolveOrdinalScale(ordinalDef, colorValues);
  const entries: Array<LegendEntry> = domain.map((category): LegendEntry => ({ label: showLabels ? String(category) : '', color: ordinal(category) }));
  return { ...baseInput, form: 'swatch', title, entries };
};

/** 单个 legend 在其所在边的预留带宽 / 带高（user units）；无文字度量 → 固定估算，溢出可接受（plot-design §13.1） */
const LEGEND_BAND_EXTENT = 80;

/** legend 与主体绘图区之间的间距（user units）；在预留带内让出，避免图例紧贴内容 */
const LEGEND_CONTENT_GAP = 24;

/**
 * 据 legend guide 估算各边 legend 预留带宽（同侧多个 legend 累加）
 * @description 喂 computePlotArea 在对应边收窄 plotArea（决策 ⑩）；估算式占位、不测量。
 */
const legendReserveOf = (legendGuides: Array<LegendGuide>): LegendReserve => {
  const reserve: { right: number; left: number; top: number; bottom: number } = { right: 0, left: 0, top: 0, bottom: 0 };
  for (const guide of legendGuides) {
    reserve[guide.position ?? 'right'] += LEGEND_BAND_EXTENT;
  }
  return reserve;
};

/**
 * 为每个 legend 计算预留带矩形（落在 plotArea 旁的预留 gutter 内；同侧按声明序堆叠）
 * @description gutter 由 computePlotArea 在对应边按 legendReserveOf 让出；此处把每个 legend 摆进其所在边的带。
 */
const reserveLegendBands = (legendGuides: Array<LegendGuide>, width: number, height: number, plotArea: Rect): Array<Rect> => {
  const perSideOffset = new Map<string, number>();
  return legendGuides.map((guide): Rect => {
    const position = guide.position ?? 'right';
    const offset = perSideOffset.get(position) ?? 0;
    perSideOffset.set(position, offset + LEGEND_BAND_EXTENT);
    const plotRight = plotArea.x + plotArea.width;
    const plotBottom = plotArea.y + plotArea.height;
    switch (position) {
      case 'left':
        // 带右沿留 GAP 到 plot 左边（content 从带左起摆，本就远离 plot；右沿额外让 GAP）
        return { x: 4, y: plotArea.y + offset, width: Math.max(0, plotArea.x - 4 - LEGEND_CONTENT_GAP), height };
      case 'top':
        return { x: plotArea.x + offset, y: 4, width: LEGEND_BAND_EXTENT, height: Math.max(0, plotArea.y - 4 - LEGEND_CONTENT_GAP) };
      case 'bottom':
        return { x: plotArea.x + offset, y: plotBottom + LEGEND_CONTENT_GAP, width: LEGEND_BAND_EXTENT, height: Math.max(0, height - plotBottom - LEGEND_CONTENT_GAP) };
      default:
        return { x: plotRight + LEGEND_CONTENT_GAP, y: plotArea.y + offset, width: Math.max(0, width - plotRight - LEGEND_CONTENT_GAP), height };
    }
  });
};

/**
 * 解析所有 legend guide → core legend scope（据通道 + 绑定 scale 类型选 swatch / ramp / 分箱 / 梯度符号）
 * @description color descriptor 从 PlotSpec.scales 具名 color scale 取（多于一个且未消歧 → fail-loud）；
 *   size / opacity / shape 从 resolver descriptor 注册表取。形态由 scale 类型决定，标签复用 axis formatter 链（决策 ⑨）。
 *   每个 legend 下沉成稳定 'legend' 前缀 id 的独立 scope，落在传入的预留带内。
 */
const buildLegendLayers = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, PlotFieldTypeValue>,
  channelDescriptors: Map<LegendChannelValue, ScaleDescriptor>,
  legendGuides: Array<LegendGuide>,
  fontSize: number,
  bands: Array<Rect>,
): Array<IRScope> => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return legendGuides.map((guide, legendIndex): IRScope => {
    const band = bands[legendIndex] ?? { x: 0, y: 0, width: 0, height: 0 };
    const orient = guide.orient ?? (guide.position === 'top' || guide.position === 'bottom' ? 'horizontal' : 'vertical');
    const id = legendGuides.length > 1 ? `legend.${guide.channel}.${legendIndex}` : `legend.${guide.channel}`;
    const baseInput: LegendBaseInput = { channel: guide.channel, position: guide.position ?? 'right', orient, fontSize, band, id };
    const showLabels = guide.tickLabels !== false;

    if (guide.channel === 'color') {
      const input = resolveColorLegend(node, rows, fieldTypes, scaleByName, guide, baseInput, showLabels);
      return lowerLegend(input);
    }
    // size / opacity / shape：从 resolver descriptor 取
    const descriptor = channelDescriptors.get(guide.channel);
    if (!descriptor) {
      throw new Error(`lowerPlots: legend channel "${guide.channel}" has no bound scale (no mark encodes ${guide.channel} by field); cannot derive a legend`);
    }
    // 标题只在用户显式给时渲染（见 resolveColorLegend 同注）
    const title = guide.title;
    if (guide.channel === 'shape') {
      const entries: Array<LegendEntry> = descriptor.domain.map((category, index) => ({ label: showLabels ? String(category) : '', shape: String(descriptor.range[index]), color: 'currentColor' }));
      return lowerLegend({ ...baseInput, form: 'swatch', title, entries });
    }
    if (guide.channel === 'size') {
      const [lo, hi] = [Number(descriptor.domain[0]), Number(descriptor.domain[descriptor.domain.length - 1])];
      const ticks = niceNumericTicks([lo, hi], guide.tickCount ?? 3).filter(tick => tick.value > 0);
      const reps = ticks.length > 0 ? ticks : [{ value: hi, offset: 1, label: String(hi) }];
      // 半径据 descriptor range（与 mark 实绘同源）线性插值（sqrt domain→radius）
      const [rMin, rMax] = [Number(descriptor.range[0]), Number(descriptor.range[descriptor.range.length - 1])];
      const radiusScale = resolveSqrtForLegend([lo, hi], [rMin, rMax]);
      const entries: Array<LegendEntry> = reps.map(tick => ({ label: showLabels ? tick.label : '', radius: radiusScale(tick.value) }));
      return lowerLegend({ ...baseInput, form: 'swatch', title, entries });
    }
    // opacity：梯度透明度块（nice 几档 + 透明度）
    const [lo, hi] = [Number(descriptor.domain[0]), Number(descriptor.domain[descriptor.domain.length - 1])];
    const ticks = niceNumericTicks([lo, hi], guide.tickCount ?? 3);
    const [oMin, oMax] = [Number(descriptor.range[0]), Number(descriptor.range[descriptor.range.length - 1])];
    const span = hi - lo;
    const entries: Array<LegendEntry> = ticks.map(tick => {
      const t = span === 0 ? 1 : (tick.value - lo) / span;
      return { label: showLabels ? tick.label : '', opacity: oMin + (oMax - oMin) * Math.max(0, Math.min(1, t)) };
    });
    return lowerLegend({ ...baseInput, form: 'swatch', title, entries });
  });
};

/**
 * 校验 fieldMaps（fail-loud）：ref∈datasets；本 plot 的 map 需 model + 逻辑名∈model
 * @description 抽出供 expandPlot 与 createPlotLocator 共用，保证「render 抛错 ⟺ locator 抛错」的 parity（评审 P2）
 */
export const validateFieldMaps = (spec: PlotSpec, datasets: ExternalDatasets, fieldMaps: LowerPlotsOptions['fieldMaps']): void => {
  if (fieldMaps === undefined) return;
  for (const ref of Object.keys(fieldMaps)) {
    if (!(ref in datasets)) throw new Error(`lowerPlots: fieldMaps references unknown dataset "${ref}"`);
  }
  if (!(spec.data.reference in fieldMaps)) return;
  const fieldMap = fieldMaps[spec.data.reference];
  if (spec.data.model === undefined) {
    throw new Error(`lowerPlots: fieldMaps for "${spec.data.reference}" requires data.model (no logical field contract without a model)`);
  }
  const declared = new Set(spec.data.model.map(field => field.name));
  for (const logical of Object.keys(fieldMap)) {
    if (!declared.has(logical)) {
      throw new Error(`lowerPlots: fieldMaps["${spec.data.reference}"] maps unknown logical field "${logical}" (not in data.model)`);
    }
  }
};

/**
 * 共享的「绑定准备」：fieldMaps 校验 + 用户源字段类型解析 + ingest 恒归一化
 * @description expandPlot 与 createPlotLocator 共用同一入口，保证两者校验 / 归一化 / 类型解析完全同序（评审 P2 parity）。
 *   入参 ingested 由调用方按各自需要先行 tagSourceIndex；本函数不碰 transform（调用方各自 applyTransforms）。
 *   恒归一化（ADR-08）：无论有无 model / resolver，总按解析出的 fieldTypes 跑 normalizeRows，下游统一读 canonical。
 */
export const prepareRows = (
  spec: PlotSpec,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions,
  ingested: Array<ExternalRow>,
): { fieldTypes: Map<string, PlotFieldTypeValue>; normalized: Array<ExternalRow> } => {
  validateFieldMaps(spec, datasets, options.fieldMaps);
  const userSourceFields = collectUserSourceFields(spec);
  // strict + 声明/推断（ADR-01/05）；strict 在 applyFieldResolver 之前先校验，resolver 不绕过（ADR-04）
  const baseTypes = resolveFieldTypes(spec.data.model, ingested, userSourceFields);
  const fieldMap = options.fieldMaps?.[spec.data.reference];
  // 声明式 format（ADR-06）：format 蕴含 type 覆盖推断 + 冲突 fail-loud + 收集 format parser；置于 resolveField 之前，使 resolveField 仍胜出
  const { fieldTypes: formatTypes, parsers: formatParsers } = collectFormatFields(spec.data.model, baseTypes, userSourceFields);
  // resolveField 叠加：类型覆盖 + 收集 per-field parser（ADR-04）；优先级 resolveField.type > format 蕴含 / 显式 type
  const { fieldTypes, parsers: resolverParsers } = applyFieldResolver(
    formatTypes,
    userSourceFields,
    spec.data.model,
    spec.data.reference,
    fieldMap,
    options.resolveField,
  );
  // 合并 parser 槽：format parser 垫底，resolveField.parse 命中同字段时覆盖（优先级 resolveField > format）
  const parsers = new Map([...formatParsers, ...resolverParsers]);
  // 恒归一化（ADR-08 去门控）：无论有无 model / resolver 命中，总按解析出的 fieldTypes 跑 normalizeRows
  //   →下游统一读 canonical、无第二处 coerce。干净数据产物与旧门控路径逐字段等价。
  const normalized = normalizeRows(ingested, fieldTypes, fieldMap, parsers);
  return { fieldTypes, normalized };
};

/**
 * 把一个 Plot IR 根节点 + 外部数据下沉成一个 core Scope
 * @description 编排：校验 ref/scale → 收集轴值 → 建归一化 scale → 建投影器（resolveFrame）→ 各 mark 下沉 → 包 localNamespace Scope。
 *   root id → Scope.id（plot-design §8.1）；provenance 开 → 外层 Scope + 各层 / datum 带来源 meta + `<plotId>.` 内部 id。
 */
const expandPlot = (node: PlotSpec, datasets: ExternalDatasets, options: LowerPlotsOptions): IRChild => {
  // 自描述尺寸（ADR-02 L1-a）：节点自带 width/height 优先（组合时各面板本性尺寸），缺省回退全局选项、再回退默认
  const width = node.width ?? options.width ?? DEFAULT_WIDTH;
  const height = node.height ?? options.height ?? DEFAULT_HEIGHT;
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

  // provenance 总开关：provenance / datumProvenance / datumIdField 任一开即启用（后两者蕴含 provenance）；
  // 全关 → undefined（产物逐字节等价 alpha.4）
  const provenanceEnabled = options.provenance === true || options.datumProvenance === true || options.datumIdField !== undefined;
  const provenance: ProvenanceContext | undefined = provenanceEnabled
    ? {
        plotId: node.id,
        dataReference: node.data.reference,
        datumProvenance: options.datumProvenance ?? false,
        datumIdField: options.datumIdField,
      }
    : undefined;

  // 取数：provenance 开时先打源序标记（symbol 键，跨 transform 存活，供 sourceIndex 回指），再过 transform 管线
  const ingested = provenance ? tagSourceIndex(datasets[node.data.reference]) : datasets[node.data.reference];

  // ADR-01/02/08：fieldMaps 校验 + 用户源字段类型解析（strict）+ ingest 恒归一化。与 locator 共用 prepareRows 保 parity。
  // 类型 Map 是 type-driven scale（ADR-03）/ coercion 的单一真源；归一化置于 transform 前、无论有无 model 都跑（恒 canonical）。
  const { fieldTypes, normalized } = prepareRows(node, datasets, options, ingested);
  if (options.validateData) {
    const sampleRows = typeof options.validateData === 'object' ? options.validateData.sampleRows ?? 100 : 100;
    validateBoundData(normalized, fieldTypes, sampleRows);
  }
  // invalid:'error'（ADR-08）：transform 之前对 spec 参与字段（= fieldTypes 键）全量校验，遇任一非法 / 缺失 fail-loud；
  //   置于 transform 前 → 错误定位到原始源字段、不被 transform 改写干扰。默认 'skip' 不校验（哨兵留给下游跳）。
  if (options.invalid === 'error') {
    assertAllValuesValid(normalized, fieldTypes);
  }

  const rows = applyTransforms(normalized, node.transform);

  const { frame, gridLayers, axisLayers, plotArea } = resolveFrame({
    node,
    rows,
    fieldTypes,
    width,
    height,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    margin: options.margin,
    provenance,
    coordinates: options.coordinates,
  });

  const resolveColor = makeColorResolver(node, rows, fieldTypes);
  const resolveSize = makeSizeResolver(node, rows, fieldTypes);
  const resolveOpacity = makeOpacityResolver(node, rows, fieldTypes);
  const resolveShape = makeShapeResolver(node, rows, fieldTypes);

  // plot 级 datum id 登记器：datumIdField + plotId 在时建一份，线穿全 mark——跨 mark 共享 seen，
  // 两 datum-bearing mark（point + bar）撞同 `<plotId>.datum.<value>` 即 fail loud（#2）。
  const registerDatumId: DatumIdRegistrar | undefined =
    provenance && provenance.datumIdField !== undefined && provenance.plotId !== undefined
      ? createDatumIdRegistrar(provenance.datumIdField, provenance.plotId)
      : undefined;

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  // provenance 开 → 传 markProvenance（plotId / markIndex / datum 开关 + 共享 registerDatumId），各层 / datum 绑 id + 来源 meta
  const markLayers: Array<IRChild> = node.marks
    .map((mark, markIndex) =>
      lowerMark(mark, rows, frame, { colorOf: resolveColor(mark), sizeOf: resolveSize(mark)?.of, opacityOf: resolveOpacity(mark)?.of, shapeOf: resolveShape(mark)?.of }, provenance ? { context: provenance, markIndex, registerDatumId } : undefined),
    )
    .filter((layer): layer is IRChild => layer !== null);

  // legend（ADR-03）：收 legend guide → 据通道 + scale 类型选形态下沉成独立 scope，落 position 预留带。
  // 占位（band 计算 / plotArea 收窄）见 reserveLegendBands；fail-loud（多 scale 未消歧 / scale 不存在）在 buildLegendLayers 内。
  const legendGuides = (node.guides ?? []).filter(isLegendGuide);
  const legendLayers: Array<IRScope> = [];
  if (legendGuides.length > 0) {
    const channelDescriptors = collectChannelDescriptors(node, resolveSize, resolveOpacity, resolveShape);
    const bands = reserveLegendBands(legendGuides, width, height, plotArea);
    legendLayers.push(...buildLegendLayers(node, rows, fieldTypes, channelDescriptors, legendGuides, options.fontSize ?? DEFAULT_FONT_SIZE, bands));
  }

  // z-order：所有网格层 → marks → 所有轴层 → legend（网格垫底、坐标轴压顶不被数据盖、legend 在预留带最上）
  const children: Array<IRChild> = [...gridLayers, ...markLayers, ...axisLayers, ...legendLayers];

  // 无 id：结构逐字不变（单图零回归）——root = localNamespace 内容 scope（+ provenance meta）
  if (node.id === undefined) {
    const base: IRScope = { type: 'scope', localNamespace: true, children };
    return provenance ? { ...base, meta: rootMeta(provenance.dataReference) } : base;
  }

  // 有 id（ADR-02 L1-b）：外层 panel scope（id、非 localNamespace → 面板 bbox 注册父帧、外部可见）
  //   ⊃ [ 内层 localNamespace 内容 scope（封内部 datum/series id、承 provenance meta）, plotArea 不可见 carrier ]。
  // 让面板 bbox `<plotId>` 与绘图区 `<plotId>.plotArea` 都落在 localNamespace 之外、外部兄弟可锚（组合连线）。
  const inner: IRScope = { type: 'scope', localNamespace: true, children };
  const innerContent: IRScope = provenance ? { ...inner, meta: rootMeta(provenance.dataReference) } : inner;
  // plotArea 精确矩形 carrier：几何 = 扣除轴 / legend 后的绘图区；opacity 0 不可见，仅登记 bbox 锚
  const plotAreaCarrier: IRNode = {
    type: 'node',
    id: `${node.id}.plotArea`,
    position: [plotArea.x + plotArea.width / 2, plotArea.y + plotArea.height / 2],
    shape: 'rectangle',
    minimumWidth: plotArea.width,
    minimumHeight: plotArea.height,
    padding: 0,
    opacity: 0,
  };
  return { type: 'scope', id: node.id, children: [innerContent, plotAreaCarrier] };
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
    schema: PlotSpecSchema,
    expand: (node: PlotSpec) => expandPlot(node, datasets, options),
  }),
];
