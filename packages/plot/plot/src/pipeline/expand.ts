import { type CompositeDefinition, type IRChild, type IRNode, type IRScope, JsonObjectSchema, defineComposite } from '@retikz/core';
import { isFiniteNumber } from '@retikz/math';
import { type AxisGuide, type Channel, type ExternalDatasets, type ExternalRow, type Guide, IntervalBoundKind, type IntervalMark, type LegendChannelValue, type LegendGuide, type Mark, type MarkOperation, PlotFieldType, type PlotFieldTypeValue, PlotGuide, PlotMark, PlotScale, type PlotSpec, PlotSpecSchema, type ScaleOperation, isBuiltinMark } from '../schemas';
import { resolveIntervalBound } from '../providers';
import { type ResolveField, type ResolveLabel, applyFieldResolver, assertAllValuesValid, channelValue, collectFormatFields, labelOf, normalizeRows, resolveFieldPath, resolveFieldTypes, toTimestamp, validateBoundData } from '../data';
import { type LegendEntry, type LegendInput, lowerCustomAxis, lowerGuide, lowerLegend } from '../guide/guide';
import { DEFAULT_FONT_SIZE, type LegendReserve, type Margins, type Rect } from './layout';
import { type ColorOf, type LabelOf, lowerMark } from '../providers';
import { type ChannelResolution, type ScaleDescriptor, makeNumericStyleResolver, makeOpacityResolver, makeShapeResolver, makeSizeResolver, makeStrokeWidthResolver } from '../providers';
import { type AnyCoordinateDefinition, type CoordinateFrame } from '../contract';
import { resolveCoordinateRegistry } from '../providers';
import { type DatumIdRegistrar, type ProvenanceContext, createDatumIdRegistrar, rootMeta, tagSourceIndex } from './provenance';
import { type CategoryOrder, DEFAULT_PLOT_COLORS, DEFAULT_TICK_COUNT, deriveScale, makeColorSchemeResolver, orderedCategoryDomain, resolveLinearScale, resolveSqrtScale, scaleTicks } from '../providers';
import { type AnyScaleDefinition, type ChannelResolveContext, isBuiltinScaleOperation } from '../contract';
import { assertBaselineScaleCompatible, assertScaleFieldCompatible, resolveChannelScale, resolvePositionScale, resolveScaleRegistry } from '../providers';
import { type AnyMarkDefinition, type AnyTransformDefinition } from '../contract';
import { applyTransforms, resolveMarkRegistry, resolveTransformRegistry } from '../providers';
import { collectSourceFields } from './source-fields';

/** link 的 target 端通道（source 端走 x/yChannelOf；两端都须纳入位置 scale 域，否则 target 投影越界） */
const linkTargetChannelOf = (mark: Mark, role: 'x' | 'y'): Channel | undefined =>
  mark.type === PlotMark.Link ? (role === 'x' ? mark.target.x : mark.target.y) : undefined;

/**
 * interval mark 在某位置 role 对 scale 域的贡献值（按 bounds 来源）
 * @description band / span → 取 encoding 位置通道值（band 为类别、span 为值，baseline 由 includeBaseline 纳入）；
 *   extent → 取两字段（histogram 箱边 / 堆叠 y0,y1 / 累积饼角 start,end）；full → 不贡献（满铺坐标域）。
 */
const intervalRoleValues = (mark: IntervalMark, axis: 'primary' | 'secondary', pick: (mark: MarkOperation) => Channel | undefined, rows: Array<ExternalRow>): Array<unknown> => {
  const bound = resolveIntervalBound(mark, axis === 'primary' ? 'x' : 'y');
  if (bound.kind === IntervalBoundKind.Extent) return rows.flatMap(row => [resolveFieldPath(row, bound.from), resolveFieldPath(row, bound.to)]);
  if (bound.kind === IntervalBoundKind.Full) return [];
  const channel = pick(mark);
  if (channel === undefined) return [];
  return rows.map(row => channelValue(channel, row));
};

/** interval mark 在某 role 是否需把 baseline 0 纳入连续域（span / extent 值轴含 0；band / full 不需） */
const intervalContributesBaseline = (mark: IntervalMark, axis: 'primary' | 'secondary'): boolean => {
  const bound = resolveIntervalBound(mark, axis === 'primary' ? 'x' : 'y');
  return bound.kind === IntervalBoundKind.Span || bound.kind === IntervalBoundKind.Extent;
};

const defaultColorOf = (node: PlotSpec, markIndex: number): string => {
  const colors = node.colors ?? DEFAULT_PLOT_COLORS;
  return colors[markIndex % colors.length];
};

const pointMarkValueChannel =(value: { kind: 'field' | 'constant'; value: unknown; scale?: string } | undefined): Channel | undefined => {
  if (value === undefined) return undefined;
  return value.kind === 'field' ? { field: String(value.value), ...(value.scale !== undefined ? { scale: value.scale } : {}) } : { value: value.value as Channel['value'] };
};

/** 读 mark 的 encoding（内置与自定义共享 EncodingSchema 形态）；自定义 mark 缺 encoding 时 undefined。 */
const markEncoding = (mark: MarkOperation): Record<string, Channel | undefined> | undefined => (mark as { encoding?: Record<string, Channel | undefined> }).encoding;

const markColorChannel = (mark: MarkOperation): Channel | undefined => {
  if (isBuiltinMark(mark) && mark.type === PlotMark.Point) return pointMarkValueChannel(mark.color);
  return markEncoding(mark)?.color;
};

const pointStrokeChannel = (mark: MarkOperation): Channel | undefined => {
  if (!isBuiltinMark(mark) || mark.type !== PlotMark.Point || mark.stroke === undefined) return undefined;
  return mark.stroke.kind === 'field' ? { field: mark.stroke.value, ...(mark.stroke.scale !== undefined ? { scale: mark.stroke.scale } : {}) } : { value: mark.stroke.value };
};

const pointFillChannel = (mark: MarkOperation): Channel | undefined => {
  if (!isBuiltinMark(mark) || mark.type !== PlotMark.Point || mark.fill === undefined || mark.fill.kind !== 'field') return undefined;
  return { field: mark.fill.value, ...(mark.fill.scale !== undefined ? { scale: mark.fill.scale } : {}) };
};

/** guide 谓词：按 type 判别串收窄成 axis / legend 子集 */
const isAxisGuide = (guide: Guide): guide is AxisGuide => guide.type === PlotGuide.Axis;
const isLegendGuide = (guide: Guide): guide is LegendGuide => guide.type === PlotGuide.Legend;

/**
 * 按坐标系合法集校验每根 axis guide 的 dimension（ADR-01，修 cross-review P2）
 * @description 非法 dimension（如 cartesian 下 'angle'）从「静默丢弃 / 渲杂散轴线」改 fail-loud，给清晰错误。
 */
const assertValidGuideDimensions = (coordinateType: string, roles: ReadonlyArray<'x' | 'y' | 'z'>, axisGuides: Array<AxisGuide>): void => {
  const valid = roles;
  for (const guide of axisGuides) {
    if (!valid.includes(guide.dimension)) {
      throw new Error(`lowerPlots: ${coordinateType} coordinate system does not support axis dimension "${guide.dimension}" (valid dimensions: ${valid.join(', ')})`);
    }
  }
};

/**
 * 按坐标系必填角色集校验每个位置 mark 的 encoding（ADR-01；x/y 转可选后必填性下放此处）
 * @description sector 无位置通道（角度来自累积界）→ 跳过；其余 mark 缺任一必填角色通道 → fail-loud。
 */
const assertRequiredPositionChannels = (coordinateType: string, roles: ReadonlyArray<'x' | 'y' | 'z'>, marks: ReadonlyArray<MarkOperation>): void => {
  const required = roles;
  for (const mark of marks) {
    // 自定义 mark：必填位置通道由其 MarkDefinition.lower 自行 fail-loud，不在通用校验内强制
    if (!isBuiltinMark(mark)) continue;
    // reference 取向由 encoding.x XOR y 决定（绑一个、缺一个）；其取向校验在 lowerReference fail-loud
    if (mark.type === PlotMark.Reference) continue;
    // link 位置来自 source / target 字段对（非 encoding.x/y）；端点缺失校验在 lowerLink fail-loud
    if (mark.type === PlotMark.Link) continue;
    // interval：band / span bounds 需对应 encoding 位置通道；extent（字段区间）/ full（满域）从字段 / 坐标系取位置，豁免该角色
    if (mark.type === PlotMark.Interval) {
      const encoding = mark.encoding as Record<string, Channel | undefined>;
      for (const channel of required) {
        if (channel !== 'x' && channel !== 'y') continue;
        const bound = resolveIntervalBound(mark, channel);
        if (bound.kind === IntervalBoundKind.Extent || bound.kind === IntervalBoundKind.Full) continue;
        if (encoding[channel] === undefined) {
          throw new Error(`lowerPlots: ${coordinateType} coordinate system requires the "${channel}" position channel on ${mark.type} marks, but it is missing`);
        }
      }
      continue;
    }
    // point / path / region：所有必填位置角色都要对应 encoding 通道
    const encoding = mark.encoding as Record<string, Channel | undefined>;
    for (const channel of required) {
      if (encoding[channel] === undefined) {
        throw new Error(`lowerPlots: ${coordinateType} coordinate system requires the "${channel}" position channel on ${mark.type} marks, but it is missing`);
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
   * datum label 内容逃生舱（运行时函数，不进 IR；ADR-04 text mark）：按 mark id 映射的「行 → 完全自定义标签串」。
   * @description 优先级最高（resolveLabel > field+format > value），覆盖该 mark 的 label / text 内容声明。
   *   按 mark id 取（宿主 mark 的 priority-1 label / 独立 TextMark 的 priority-2 text 共用）；未命中的 mark 走声明层 field/value/format。
   *   不进 PlotSpec，故不破坏 IR JSON 可序列化。
   */
  resolveLabel?: Record<string, ResolveLabel>;
  /**
   * 自定义坐标系 definition 数组（运行时函数，不进 IR）：spec 的 `coordinate: {type:<customType>, ...config}` 据此解析投影。
   * @description 让用户插入任意坐标系几何（曲线一维 / 拱形 x 轴等），无需给坐标系枚举塞成员、也不破坏 IR JSON 化。未注册 type → fail-loud。
   */
  coordinates?: Array<AnyCoordinateDefinition>;
  /**
   * 自定义 transform definition 数组（运行时函数，不进 IR）：spec.transform 的 `{kind:<customKind>, ...config}` 据此校验并执行。
   * @description 内置 transform 恒可用；自定义 kind 未注册 / kind 冲突会 fail-loud，避免静默跳过结构性数据变换。
   */
  transformDefinitions?: Array<AnyTransformDefinition>;
  /**
   * 自定义 scale definition 数组（运行时函数，不进 IR）：spec.scales 的 `{type:<customType>, name, ...config}` 据此校验并解析。
   * @description 内置 13 个 scale 恒可用；自定义 type 未注册 / type 冲突会 fail-loud。position 族喂 coordinate 投影 + guide，channel 族喂 color 通道 + legend。
   */
  scaleDefinitions?: Array<AnyScaleDefinition>;
  /**
   * 自定义命名配色 scheme（name → interpolator 纯函数，不进 IR）：IR 只存 scheme 名串，求值期解析为函数。
   * @description 先查内置 scheme、再查此表；sequential / diverging / quantize / threshold / quantile 与自定义 channel scale 均可引用自定义 scheme 名。未命中 fail-loud。
   */
  colorSchemes?: Record<string, (t: number) => string>;
  /**
   * 自定义 mark definition 数组（运行时函数，不进 IR）：spec.marks 的 `{type:<customType>, ...}` 据此查找 lower 行为。
   * @description 内置 mark 恒可用；自定义 type 未注册 / type 冲突会 fail-loud，避免静默跳过图元下沉。
   */
  markDefinitions?: Array<AnyMarkDefinition>;
};

/** resolveFrame 产物：mark / guide 共用的投影帧 + 已下沉的网格 / 轴层（z-order 由 expand 编排） */
export type CoordinateFrameResolution = {
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
  /** 自定义坐标系 definition 数组（运行时函数，不进 IR）；coordinate {type:<customType>, ...config} 据此解析投影 */
  coordinates?: Array<AnyCoordinateDefinition>;
  /** scale registry（内置 13 + 自定义 scaleDefinitions）；position 投影 / channel 取色 / compat 共用单一真源，保 locator parity */
  scaleRegistry: Map<string, AnyScaleDefinition>;
};

/**
 * 按坐标系解析出 mark / guide 共用的投影帧 + 下沉 guide 层
 * @description cartesian：x/y 角色绑 x/y scale、走 plotArea + 直线轴；polar：angle/radius 角色、走 polar layout + 弧 / 辐条轴。
 *   抽成纯函数使 mark 下沉与 ADR-02 locator 共用同一投影（杜绝两套投影漂移）；产物与内联版等价。
 */
export const resolveFrame = (params: ResolveFrameParams): CoordinateFrameResolution => {
  const { node, rows, fieldTypes, width, height, fontSize, margin, provenance, coordinates, scaleRegistry } = params;
  const coordinateOperation = node.coordinate;
  const coordinateRegistry = resolveCoordinateRegistry(coordinates);
  const coordinateDefinition = coordinateRegistry.get(coordinateOperation.type);
  if (coordinateDefinition === undefined) {
    throw new Error(`lowerPlots: coordinate type "${coordinateOperation.type}" is not registered; pass a CoordinateDefinition via options.coordinates`);
  }
  const roles = coordinateDefinition.roles as ReadonlyArray<'x' | 'y' | 'z'>;
  const axisGuides = (node.guides ?? []).filter(isAxisGuide);
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));

  // ADR-01 校验（建 frame 前）：guide 维度按坐标系合法集校验 + mark 必填位置角色校验，均 fail-loud。
  assertValidGuideDimensions(coordinateOperation.type, roles, axisGuides);
  assertRequiredPositionChannels(coordinateOperation.type, roles, node.marks);

  // 收集某角色（位置 scale 名 + 通道角色）下所有 mark 的通道原始值（不预过滤）：
  //   连续 scale 内部过滤为有限数求 extent、分类 scale 按数据序去重推断 domain。
  // role 决定从哪个通道取值：cartesian 用 x/y；polar 用 angle??x / radius??y（mark 不写死笛卡尔）。
  const collectValues = (
    axis: 'primary' | 'secondary' | undefined,
    pick: (mark: MarkOperation) => Channel | undefined,
    includeBaseline: boolean,
    ribbonRole?: 'x' | 'y',
  ): Array<unknown> => {
    const out: Array<unknown> = [];
    for (const mark of node.marks) {
      // interval：域贡献按 bounds 来源（band/span → 位置通道值、extent → 两字段、full → 不贡献），统一替代旧 histogram / stack / sector 特判
      if (isBuiltinMark(mark) && mark.type === PlotMark.Interval && axis !== undefined) {
        out.push(...intervalRoleValues(mark, axis, pick, rows));
        continue;
      }
      // link 两端都进位置 scale 域：source 端走 pick（= source.x/y），target 端单独收（否则 target 投影越界）
      if (ribbonRole !== undefined && isBuiltinMark(mark) && mark.type === PlotMark.Link) {
        const sourceChannel = pick(mark);
        const targetChannel = linkTargetChannelOf(mark, ribbonRole);
        for (const row of rows) {
          if (sourceChannel !== undefined) out.push(channelValue(sourceChannel, row));
          if (targetChannel !== undefined) out.push(channelValue(targetChannel, row));
        }
        continue;
      }
      const channel = pick(mark);
      if (channel === undefined) continue;
      for (const row of rows) {
        out.push(channelValue(channel, row));
      }
    }
    // 值轴从 baseline 起：interval span / extent + region 把 baseline 纳入连续域（即便所有值同号）
    if (includeBaseline) {
      if (axis !== undefined && node.marks.some(mark => isBuiltinMark(mark) && mark.type === PlotMark.Interval && intervalContributesBaseline(mark, axis))) out.push(0);
      for (const mark of node.marks) {
        if (isBuiltinMark(mark) && mark.type === PlotMark.Region) out.push(mark.baseline ?? 0);
      }
    }
    return out;
  };

  // 某角色（跨所有 mark）绑定字段的全部类型——多 mark 共用一角色时须校验 / 派生全部，不能只看首个
  const roleFieldTypes = (pick: (mark: MarkOperation) => Channel | undefined): Array<PlotFieldTypeValue> => {
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
  const resolveRoleOrder = (role: string, pick: (mark: MarkOperation) => Channel | undefined): CategoryOrder | undefined => {
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
  const resolveScaleForRole = (role: 'x' | 'y' | 'z', scaleName: string | undefined, pick: (mark: MarkOperation) => Channel | undefined, values: Array<unknown>): ScaleOperation => {
    const types = roleFieldTypes(pick);
    // 解析该 role 有效 order（含「非分类配 order」「冲突 order」两道 fail-loud），无论 scale 显式与否都先校验
    const order = resolveRoleOrder(role, pick);
    let def: ScaleOperation;
    if (scaleName !== undefined) {
      const found = scaleByName.get(scaleName);
      if (!found) throw new Error(`lowerPlots: coordinate.${role} references unknown scale "${scaleName}"`);
      if (node.data.model !== undefined) {
        for (const type of types) assertScaleFieldCompatible(role, found.type, type, scaleName, scaleRegistry);
      }
      def = found;
    } else {
      const distinct = [...new Set(types)];
      if (distinct.length > 1) {
        throw new Error(`lowerPlots: coordinate.${role} omitted but its bound fields have mixed types [${distinct.join(', ')}]; declare an explicit scale`);
      }
      def = deriveScale(distinct[0], `__${role}`);
    }
    // order 注入：仅当字段有非默认 order 且该 scale 是内置 band/point 且 domain 未显式给（显式 domain 优先、压过 order）
    if (order !== undefined && isBuiltinScaleOperation(def) && (def.type === PlotScale.Band || def.type === PlotScale.Point) && def.domain === undefined) {
      return { ...def, domain: orderedCategoryDomain(values, order) };
    }
    return def;
  };

  const roleChannelOf = (role: 'x' | 'y' | 'z', includeLinkSource = false) => (mark: MarkOperation): Channel | undefined => {
    if (isBuiltinMark(mark) && mark.type === PlotMark.Link) return includeLinkSource ? (role === 'x' ? mark.source.x : mark.source.y) : undefined;
    return markEncoding(mark)?.[role];
  };

  const resolveScaleForDefinitionRole = (role: 'x' | 'y' | 'z', scaleName: string | undefined, values: Array<unknown>, opts?: { includeLinkSource?: boolean }): ScaleOperation =>
    resolveScaleForRole(role, scaleName, roleChannelOf(role, opts?.includeLinkSource ?? false), values);

  // legend 预留：按 position 在对应边让出带宽，plotArea 据此收窄（决策 ⑩）
  const legendReserve = legendReserveOf((node.guides ?? []).filter(isLegendGuide));

  JsonObjectSchema.parse(coordinateOperation);
  const parsedCoordinateOperation = coordinateDefinition.schema.parse(coordinateOperation) as never;
  JsonObjectSchema.parse(parsedCoordinateOperation);
  const resolution = coordinateDefinition.resolve(parsedCoordinateOperation, {
    width,
    height,
    fontSize,
    ...(margin !== undefined ? { margin } : {}),
    legendReserve,
    ...(provenance !== undefined ? { provenance } : {}),
    collectRoleValues: (role, opts) => collectValues(undefined, roleChannelOf(role), opts?.includeBaseline ?? false),
    collectPositionValues: (role, opts) =>
      collectValues(
        opts?.axis,
        roleChannelOf(role, opts?.includeLinkSource ?? false),
        opts?.includeBaseline ?? false,
        opts?.includeLinkTargets === true && (role === 'x' || role === 'y') ? role : undefined,
      ),
    resolveScaleForRole: resolveScaleForDefinitionRole,
    buildPositionScale: (def, values, range) => resolvePositionScale(def, values, [range[0], range[1]], scaleRegistry),
    assertBaselineScaleCompatible: (scaleType, marks) => assertBaselineScaleCompatible(scaleType, marks, scaleRegistry),
    axisGuides,
    lowerGuide,
    lowerCustomAxis,
    rows,
    marks: node.marks,
  });
  return {
    frame: resolution.frame,
    gridLayers: resolution.gridLayers,
    axisLayers: resolution.axisLayers,
    plotArea: resolution.plotArea,
  };
};

/**
 * 解析某 mark 的 color-like 编码 → 行→颜色串：常量 value 直用；字段经 registry channel scale 取色。
 * @description 显式引用色阶 → 查 scaleByName；缺省（分类 / 未知字段）→ 合成默认 ordinal。
 *   连续 / temporal 字段须显式引用连续 / 离散化色阶（path / area 整体图元按 datum 取色无意义 → fail-loud）。
 *   内置与自定义 channel scale 经同一 resolveChannelScale 分派，evaluator 与 legend 同源。
 */
const makeColorResolver = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, PlotFieldTypeValue>,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
  resolveColorScheme: (name: string) => (t: number) => string,
  pickChannel: (mark: MarkOperation) => Channel | undefined = markColorChannel,
  channelName = 'color',
): ((mark: MarkOperation) => ColorOf | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  // 字段名 → order（与位置通道同源 data.model）：颜色 ordinal 域按字段 order 排，保证位置 / 颜色同序
  const fieldOrders = new Map<string, CategoryOrder>();
  for (const field of node.data.model ?? []) {
    if (field.order !== undefined) fieldOrders.set(field.name, field.order);
  }
  return (mark: MarkOperation): ColorOf | undefined => {
    const channel = pickChannel(mark);
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const constant = String(channel.value);
      return () => constant;
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
    const colorFieldType = fieldTypes.get(field);
    // 连续 / temporal color：line / area 是 path 级整体图元、按 datum 取色无意义 → fail-loud；且必须显式引用色阶。
    if (colorFieldType === PlotFieldType.Continuous || colorFieldType === PlotFieldType.Temporal) {
      if (mark.type === PlotMark.Path || mark.type === PlotMark.Region) {
        throw new Error(
          `lowerPlots: continuous/temporal color field "${field}" is not supported on ${mark.type} marks (path-level glyph colored per series); continuous color applies to point / interval only`,
        );
      }
      if (channel.scale === undefined) {
        throw new Error(`lowerPlots: continuous/temporal ${channelName} field "${field}" requires an explicit sequential/diverging/quantize/threshold/quantile color scale reference`);
      }
    }
    // 解析 color scale operation：显式引用查表；缺省（分类 / 未知字段）合成默认 ordinal
    let scaleOperation: ScaleOperation;
    if (channel.scale !== undefined) {
      const found = scaleByName.get(channel.scale);
      if (!found) throw new Error(`lowerPlots: ${channelName} channel references unknown scale "${channel.scale}"`);
      scaleOperation = found;
    } else {
      scaleOperation = { type: PlotScale.Ordinal, name: `__${channelName}_${field}` };
    }
    const rawValues = rows.map(row => resolveFieldPath(row, field));
    // ordinal 域 order 注入：内置 ordinal 且未显式给 domain 且字段有非默认 order（位置 / 颜色同序）
    if (isBuiltinScaleOperation(scaleOperation) && scaleOperation.type === PlotScale.Ordinal && scaleOperation.domain === undefined) {
      const order = fieldOrders.get(field);
      if (order !== undefined && order !== 'data') scaleOperation = { ...scaleOperation, domain: orderedCategoryDomain(rawValues, order) };
    }
    const ctx: ChannelResolveContext = {
      fieldType: colorFieldType,
      toNumber: value => (isFiniteNumber(value) ? value : null),
      toTimestamp,
      resolveColorScheme,
      defaultColors: node.colors,
    };
    const resolution = resolveChannelScale(scaleOperation, rawValues, ctx, scaleRegistry);
    return row => resolution.of(resolveFieldPath(row, field));
  };
};

/**
 * 解析某 mark 的 label / text 内容 → 行→标签串（ADR-04）
 * @description 内容来源：位置 mark 的 `label.content`（priority-1）或 TextMark 的 `encoding.text`（priority-2）；
 *   无内容声明的 mark → undefined（不挂 label / 不产文本）。format 分派按 content.field 的 fieldType（temporal 走时间格式、数值走 d3-format）。
 *   运行时 resolveLabel[markId] 注入（最高优先、不进 IR）；mark 无 id 时无法命中 resolveLabel，仅走声明层。
 */
const makeLabelResolver = (fieldTypes: Map<string, PlotFieldTypeValue>, resolveLabel: Record<string, ResolveLabel> | undefined): ((mark: Mark) => LabelOf | undefined) => {
  return (mark: Mark): LabelOf | undefined => {
    const content = mark.type === PlotMark.Point && mark.encoding.text !== undefined ? mark.encoding.text : 'label' in mark ? mark.label?.content : undefined;
    const runtime = mark.id !== undefined ? resolveLabel?.[mark.id] : undefined;
    if (content === undefined && runtime === undefined) return undefined;
    const fieldType = content?.field !== undefined ? fieldTypes.get(content.field) : undefined;
    // content 缺省（仅 resolveLabel 命中）时用空内容占位通道：labelOf 内 resolveLabel 优先生效
    const effectiveContent = content ?? { value: '' };
    return (row: ExternalRow) => labelOf(effectiveContent, row, fieldType, runtime);
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
    if (!isBuiltinMark(mark)) continue;
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

/**
 * color legend 解析：定位 color scale（消歧 + fail-loud）→ 经 registry channel 解析 → 按 legendForm 选 swatch / ramp / 分箱
 * @description legendForm='ramp'（sequential / diverging）→ core linearGradient 连续色带 + nice 刻度；
 *   legendForm='swatch' + edges（quantize/threshold/quantile）→ 每档区间 swatch（区间标签闭开口契约）；
 *   legendForm='swatch' 无 edges（ordinal）→ 逐类别色块 swatch。evaluator / domain / range 与实绘同源（resolveChannelScale）。
 */
const resolveColorLegend = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, PlotFieldTypeValue>,
  scaleByName: Map<string, ScaleOperation>,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
  resolveColorScheme: (name: string) => (t: number) => string,
  guide: LegendGuide,
  baseInput: LegendBaseInput,
  showLabels: boolean,
): LegendInput => {
  // 收集被 color 通道引用的 scale 名 + 字段（具名 color scale 已物化进 scales）。
  //   point / bar / sector 都按 datum 着色（ADR-01 B/C），sector（饼 / 环）的 color.field 同样要喂 legend——
  //   scale + field 守卫已兜底无 color 编码的 mark，无需按 mark 类型排除。
  const colorBindings: Array<{ scaleName: string; field: string }> = [];
  for (const mark of node.marks) {
    const channel = markColorChannel(mark);
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
  const scaleOperation = scaleByName.get(scaleName);
  if (!scaleOperation) throw new Error(`lowerPlots: legend references unknown scale "${scaleName}"`);
  const field = colorBindings.find(binding => binding.scaleName === scaleName)?.field;
  // 标题只在用户显式给时渲染（field 名仅作占位 fallback 的语义来源，不自动生成标题 Node，避免与条目标签混淆）
  const title = guide.title;
  const colorFieldType = field !== undefined ? fieldTypes.get(field) : undefined;
  const rawValues = field !== undefined ? rows.map(row => resolveFieldPath(row, field)) : [];
  const ctx: ChannelResolveContext = {
    fieldType: colorFieldType,
    toNumber: value => (isFiniteNumber(value) ? value : null),
    toTimestamp,
    resolveColorScheme,
    defaultColors: node.colors,
  };
  // legend 只渲 scale 外观、不绑字段 → 跳过 fieldType 兼容校验；位置 scale（非 channel 族）仍 fail-loud。
  const resolution = resolveChannelScale(scaleOperation, rawValues, ctx, scaleRegistry, { checkFieldCompatible: false });

  // 连续色带 ramp：sequential / diverging（沿带等距采样色 + nice 刻度；domain = resolution.domain [lo, hi]）
  if (resolution.legendForm === 'ramp') {
    const lo = Number(resolution.domain[0]);
    const hi = Number(resolution.domain[resolution.domain.length - 1]);
    const STOP_COUNT = 8;
    const stops = Array.from({ length: STOP_COUNT }, (_unused, index) => {
      const t = index / (STOP_COUNT - 1);
      return { offset: t, color: resolution.of(lo + (hi - lo) * t) ?? '' };
    });
    const ticks = showLabels ? niceNumericTicks([lo, hi], guide.tickCount ?? DEFAULT_TICK_COUNT).map(tick => ({ offset: tick.offset, label: tick.label })) : [];
    return { ...baseInput, form: 'ramp', title, entries: [], ramp: { stops, ticks } };
  }

  // 分箱 swatch：quantize / threshold / quantile → 每档色块 + 区间标签（闭开口：[a, b)，末档闭）；edges = 档间内部边界
  if (resolution.edges !== undefined) {
    const edges = resolution.edges;
    const colors = resolution.range;
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

  // ordinal 离散 swatch：每类别一色块 + 类别标签（domain = 类别序、range = 对应色，与实绘同源）
  const entries: Array<LegendEntry> = resolution.domain.map((category, index): LegendEntry => ({ label: showLabels ? String(category) : '', color: resolution.range[index] }));
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
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
  resolveColorScheme: (name: string) => (t: number) => string,
): Array<IRScope> => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return legendGuides.map((guide, legendIndex): IRScope => {
    const band = bands[legendIndex] ?? { x: 0, y: 0, width: 0, height: 0 };
    const orient = guide.orient ?? (guide.position === 'top' || guide.position === 'bottom' ? 'horizontal' : 'vertical');
    const id = legendGuides.length > 1 ? `legend.${guide.channel}.${legendIndex}` : `legend.${guide.channel}`;
    const baseInput: LegendBaseInput = { channel: guide.channel, position: guide.position ?? 'right', orient, fontSize, band, id };
    const showLabels = guide.tickLabels !== false;

    if (guide.channel === 'color') {
      const input = resolveColorLegend(node, rows, fieldTypes, scaleByName, scaleRegistry, resolveColorScheme, guide, baseInput, showLabels);
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
): { fieldTypes: Map<string, PlotFieldTypeValue>; normalized: Array<ExternalRow>; transformRegistry: Map<string, AnyTransformDefinition>; scaleRegistry: Map<string, AnyScaleDefinition>; markRegistry: Map<string, AnyMarkDefinition> } => {
  validateFieldMaps(spec, datasets, options.fieldMaps);
  const transformRegistry = resolveTransformRegistry(options.transformDefinitions);
  const scaleRegistry = resolveScaleRegistry(options.scaleDefinitions);
  const markRegistry = resolveMarkRegistry(options.markDefinitions);
  const userSourceFields = collectSourceFields(spec, transformRegistry, markRegistry);
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
  return { fieldTypes, normalized, transformRegistry, scaleRegistry, markRegistry };
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
  const { fieldTypes, normalized, transformRegistry, scaleRegistry, markRegistry } = prepareRows(node, datasets, options, ingested);
  // scheme 解析器：内置 scheme + options.colorSchemes；channel scale 取色 / legend ramp 共用。
  const resolveColorScheme = makeColorSchemeResolver(options.colorSchemes);
  if (options.validateData) {
    const sampleRows = typeof options.validateData === 'object' ? options.validateData.sampleRows ?? 100 : 100;
    validateBoundData(normalized, fieldTypes, sampleRows);
  }
  // invalid:'error'（ADR-08）：transform 之前对 spec 参与字段（= fieldTypes 键）全量校验，遇任一非法 / 缺失 fail-loud；
  //   置于 transform 前 → 错误定位到原始源字段、不被 transform 改写干扰。默认 'skip' 不校验（哨兵留给下游跳）。
  if (options.invalid === 'error') {
    assertAllValuesValid(normalized, fieldTypes);
  }

  const rows = applyTransforms(normalized, node.transform, transformRegistry);

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
    scaleRegistry,
  });

  const resolveColor = makeColorResolver(node, rows, fieldTypes, scaleRegistry, resolveColorScheme);
  const resolveFill = makeColorResolver(node, rows, fieldTypes, scaleRegistry, resolveColorScheme, pointFillChannel, 'fill');
  const resolveStroke = makeColorResolver(node, rows, fieldTypes, scaleRegistry, resolveColorScheme, pointStrokeChannel, 'stroke');
  const resolveSize = makeSizeResolver(node, rows, fieldTypes);
  const resolveOpacity = makeOpacityResolver(node, rows, fieldTypes);
  const resolveShape = makeShapeResolver(node, rows, fieldTypes);
  const resolveStrokeWidth = makeStrokeWidthResolver(node, rows, fieldTypes);
  const resolveFillOpacity = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.fillOpacity : undefined), 'fillOpacity', { range: [0.2, 1], clamp: true });
  const resolveDrawOpacity = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.drawOpacity : undefined), 'drawOpacity', { range: [0.2, 1], clamp: true });
  const resolveRotate = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.rotate : undefined), 'rotate');
  const resolvePadding = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.padding : undefined), 'padding');
  const resolveMinimumSize = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumSize : undefined), 'minimumSize');
  const resolveMinimumWidth = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumWidth : undefined), 'minimumWidth');
  const resolveMinimumHeight = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumHeight : undefined), 'minimumHeight');
  const resolveZIndex = makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.zIndex : undefined), 'zIndex', { integer: true });
  const resolveLabelOf = makeLabelResolver(fieldTypes, options.resolveLabel);

  // plot 级 datum id 登记器：datumIdField + plotId 在时建一份，线穿全 mark——跨 mark 共享 seen，
  // 两 datum-bearing mark（point + bar）撞同 `<plotId>.datum.<value>` 即 fail loud（#2）。
  const registerDatumId: DatumIdRegistrar | undefined =
    provenance && provenance.datumIdField !== undefined && provenance.plotId !== undefined
      ? createDatumIdRegistrar(provenance.datumIdField, provenance.plotId)
      : undefined;

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  // provenance 开 → 传 markProvenance（plotId / markIndex / datum 开关 + 共享 registerDatumId），各层 / datum 绑 id + 来源 meta
  const markLayers: Array<IRChild> = node.marks
    .map((mark, markIndex) => {
      // 通用通道（color / fill / stroke）对自定义 mark 也有效（走共享 encoding）；
      // 散点专属样式通道（size / opacity / shape / 数值样式 / label）仅内置 mark，自定义 mark 在其 lower 内自理。
      const builtinMark: Mark | undefined = isBuiltinMark(mark) ? mark : undefined;
      return lowerMark(
        mark,
        rows,
        frame,
        {
          colorOf: resolveColor(mark) ?? resolveFill(mark),
          defaultColor: defaultColorOf(node, markIndex),
          sizeOf: builtinMark ? resolveSize(builtinMark)?.of : undefined,
          opacityOf: builtinMark ? resolveOpacity(builtinMark)?.of : undefined,
          shapeOf: builtinMark ? resolveShape(builtinMark)?.of : undefined,
          strokeOf: resolveStroke(mark),
          strokeWidthOf: builtinMark ? resolveStrokeWidth(builtinMark)?.of : undefined,
          fillOpacityOf: builtinMark ? resolveFillOpacity(builtinMark)?.of : undefined,
          drawOpacityOf: builtinMark ? resolveDrawOpacity(builtinMark)?.of : undefined,
          rotateOf: builtinMark ? resolveRotate(builtinMark)?.of : undefined,
          paddingOf: builtinMark ? resolvePadding(builtinMark)?.of : undefined,
          minimumSizeOf: builtinMark ? resolveMinimumSize(builtinMark)?.of : undefined,
          minimumWidthOf: builtinMark ? resolveMinimumWidth(builtinMark)?.of : undefined,
          minimumHeightOf: builtinMark ? resolveMinimumHeight(builtinMark)?.of : undefined,
          zIndexOf: builtinMark ? resolveZIndex(builtinMark)?.of : undefined,
          labelOf: builtinMark ? resolveLabelOf(builtinMark) : undefined,
        },
        provenance ? { context: provenance, markIndex, registerDatumId } : undefined,
        markRegistry,
      );
    })
    .filter((layer): layer is IRChild => layer !== null);

  // legend（ADR-03）：收 legend guide → 据通道 + scale 类型选形态下沉成独立 scope，落 position 预留带。
  // 占位（band 计算 / plotArea 收窄）见 reserveLegendBands；fail-loud（多 scale 未消歧 / scale 不存在）在 buildLegendLayers 内。
  const legendGuides = (node.guides ?? []).filter(isLegendGuide);
  const legendLayers: Array<IRScope> = [];
  if (legendGuides.length > 0) {
    const channelDescriptors = collectChannelDescriptors(node, resolveSize, resolveOpacity, resolveShape);
    const bands = reserveLegendBands(legendGuides, width, height, plotArea);
    legendLayers.push(...buildLegendLayers(node, rows, fieldTypes, channelDescriptors, legendGuides, options.fontSize ?? DEFAULT_FONT_SIZE, bands, scaleRegistry, resolveColorScheme));
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
