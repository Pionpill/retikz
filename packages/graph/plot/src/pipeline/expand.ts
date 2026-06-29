import type { CompositeDefinition, IRChild, IRJsonObject, IRNode, IRPathBase, IRScope } from '@retikz/core';

import { defineComposite, JsonObjectSchema } from '@retikz/core';

import type {
  AnchorIdGenerator,
  AnyChannelDefinition,
  AnyCoordinateDefinition,
  AnyMarkDefinition,
  AnyRowSelectorDefinition,
  AnyScaleDefinition,
  AnyStatisticsReducerDefinition,
  AnyTransformDefinition,
  CoordinateFrame,
  DimensionRole,
  FieldFormatDefinition,
  ResolveField,
  ResolveLabel,
  TickSet,
  TransformContext,
} from '../contract';
import type { LegendEntry, LegendInput } from '../features';
import type { CategoryOrder, ScaleDescriptor } from '../providers';
import type {
  AxisGuide,
  Channel,
  CoordinateOperation,
  ExternalDatasets,
  ExternalRow,
  Guide,
  IntervalMark,
  LegendChannelValue,
  LegendGuide,
  MarkOperation,
  PlotFieldTypeMap,
  PlotFieldTypeValue,
  PlotSpec,
  ScaleOperation,
  TransformOperation,
} from '../schemas';
import type { LegendReserve, Margins, Rect } from './layout';
import type { DatumIdRegistrar, ProvenanceContext } from './provenance';

import { isBuiltinScaleOperation } from '../contract';
import { lowerCustomAxis, lowerGuide, lowerLegend } from '../features';
import {
  applyFieldResolver,
  applyTransforms,
  assertAllValuesValid,
  assertBaselineScaleCompatible,
  assertScaleFieldCompatible,
  buildProportionalIntervals,
  channelKindsForMark,
  channelValue,
  collectFormatFields,
  createPositionChannelDefinitions,
  DEFAULT_PLOT_COLORS,
  DEFAULT_TICK_COUNT,
  DEFAULT_TRANSFORM_CONTEXT,
  deriveScale,
  lowerMark,
  makeColorSchemeResolver,
  normalizeRows,
  orderedCategoryDomain,
  proportionalIntervalDomainValues,
  resolveChannelRegistry,
  resolveCoordinateRegistry,
  resolveFieldPath,
  resolveFieldTypes,
  resolveFormatRegistry,
  resolveIntervalBound,
  resolveLinearScale,
  resolveMarkChannels,
  resolveMarkRegistry,
  resolvePositionScale,
  resolveRowSelectorRegistry,
  resolveScaleRegistry,
  resolveSqrtScale,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
  scaleTicks,
  validateBoundData,
} from '../providers';
import {
  AxisGridApplyTo,
  CompositionAxisPolicy,
  CompositionGridPlacement,
  IntervalBoundKind,
  isBuiltinMark,
  PathClosureKind,
  PlotFieldType,
  PlotGuide,
  PlotMark,
  PlotScale,
  PlotSpecSchema,
} from '../schemas';
import { createAnchorRegistry } from './anchors';
import { DEFAULT_FONT_SIZE } from './layout';
import { createDatumIdRegistrar, rootMeta, slug, tagSourceIndex } from './provenance';
import { collectSourceFields } from './source-fields';

/**
 * interval mark 在某位置 role 对 scale 域的贡献值（按 bounds 来源）
 * @description band / span → 取 encoding 位置通道值（band 为类别、span 为值，baseline 由 includeBaseline 纳入）；
 *   extent → 取两字段（histogram 箱边 / 堆叠 y0,y1 / 累积饼角 start,end）；full → 不贡献（满铺坐标域）。
 */
const intervalRoleValues = (
  mark: IntervalMark,
  axis: 'primary' | 'secondary',
  pick: (mark: MarkOperation) => Channel | undefined,
  rows: Array<ExternalRow>,
): Array<unknown> => {
  const bound = resolveIntervalBound(mark, axis === 'primary' ? 'x' : 'y');
  if (bound.kind === IntervalBoundKind.Extent)
    return rows.flatMap(row => [resolveFieldPath(row, bound.from), resolveFieldPath(row, bound.to)]);
  if (bound.kind === IntervalBoundKind.Proportional) return proportionalIntervalDomainValues(bound.field, rows);
  if (bound.kind === IntervalBoundKind.Full) return [];
  const channel = pick(mark);
  if (channel === undefined) return [];
  return rows.map(row => channelValue(channel, row));
};

/** interval mark 在某 role 是否需把 baseline 0 纳入连续域（span / extent 值轴含 0；band / full 不需） */
const intervalContributesBaseline = (mark: IntervalMark, axis: 'primary' | 'secondary'): boolean => {
  const bound = resolveIntervalBound(mark, axis === 'primary' ? 'x' : 'y');
  return (
    bound.kind === IntervalBoundKind.Span ||
    bound.kind === IntervalBoundKind.Extent ||
    bound.kind === IntervalBoundKind.Proportional
  );
};

const intervalBoundConsumesRoleChannel = (mark: IntervalMark, role: DimensionRole): boolean => {
  const bound = resolveIntervalBound(mark, role);
  return bound.kind === IntervalBoundKind.Band || bound.kind === IntervalBoundKind.Span;
};

const intervalProportionalAxisTicks = (
  mark: IntervalMark,
  role: DimensionRole,
  rows: Array<ExternalRow>,
): TickSet | undefined => {
  const bound = resolveIntervalBound(mark, role);
  if (bound.kind !== IntervalBoundKind.Proportional) return undefined;
  const channel = (mark.encoding as Record<string, Channel | undefined>)[role];
  if (channel?.field === undefined) return undefined;
  const intervals = buildProportionalIntervals(bound.field, rows);
  const values: TickSet['values'] = [];
  const labels: TickSet['labels'] = [];
  for (const row of rows) {
    const interval = intervals.get(row);
    if (interval === undefined) continue;
    const center = (interval[0] + interval[1]) / 2;
    if (!Number.isFinite(center)) continue;
    values.push(center);
    const label = channelValue(channel, row);
    labels.push(label === null || label === undefined ? '' : String(label));
  }
  return values.length > 0 ? { values, labels } : undefined;
};

const defaultColorOf = (node: PlotSpec, markIndex: number): string => {
  const colors = node.colors ?? DEFAULT_PLOT_COLORS;
  return colors[markIndex % colors.length];
};

export type MarkDataView = {
  mark: MarkOperation;
  rows: Array<ExternalRow>;
};

type CoordinateScopePlacement = NonNullable<NonNullable<PlotSpec['composition']>['scopes'][number]['placement']>;
type SharedScaffold = NonNullable<NonNullable<PlotSpec['composition']>['scaffolds']>[number];
type ScaffoldTrack = SharedScaffold['tracks'][number];
type CompositionLayout = NonNullable<NonNullable<PlotSpec['composition']>['layout']>;
type CompositionGuidePolicy = NonNullable<NonNullable<PlotSpec['composition']>['guidePolicy']>;

const relationTargetRoleValues = (
  mark: MarkOperation,
  role: DimensionRole,
  rows: Array<ExternalRow>,
): Array<unknown> => {
  if (!isBuiltinMark(mark) || mark.type !== PlotMark.Relation) return [];
  const refs = [
    mark.source,
    mark.target,
    ...(mark.path?.via ?? []),
    ...(mark.path?.route ?? []).flatMap(step => (step.to === undefined ? [] : [step.to])),
  ];
  const fields = refs.flatMap(ref =>
    'project' in ref && Object.prototype.hasOwnProperty.call(ref.project, role) ? [ref.project[role]] : [],
  );
  return fields.flatMap(field => rows.map(row => resolveFieldPath(row, field)));
};

/** 读 mark 的 encoding（内置与自定义共享 EncodingSchema 形态）；自定义 mark 缺 encoding 时 undefined。 */
const markEncoding = (mark: MarkOperation): Record<string, Channel | undefined> | undefined =>
  (mark as { encoding?: Record<string, Channel | undefined> }).encoding;

/** guide 谓词：按 type 判别串收窄成 axis / legend 子集 */
const isAxisGuide = (guide: Guide): guide is AxisGuide => guide.type === PlotGuide.Axis;
const isLegendGuide = (guide: Guide): guide is LegendGuide => guide.type === PlotGuide.Legend;

const DEFAULT_COORDINATE_SCOPE_ID = 'default';

export type CoordinateScopeRegistryEntry = {
  id: string;
  coordinate: CoordinateOperation;
  placement?: CoordinateScopePlacement;
  scaffold?: string;
  track?: string;
};

export type CoordinateScopeRegistry = {
  defaultScope: string;
  scopes: Array<CoordinateScopeRegistryEntry>;
};

export const resolveCoordinateScopeRegistry = (node: PlotSpec): CoordinateScopeRegistry => {
  if (node.composition !== undefined) {
    const scaffoldById = new Map((node.composition.scaffolds ?? []).map(scaffold => [scaffold.id, scaffold] as const));
    return {
      defaultScope: node.composition.defaultScope,
      scopes: node.composition.scopes.map(scope => {
        const placement = scope.placement;
        const scaffold = placement?.kind === 'track' ? scaffoldById.get(placement.scaffold) : undefined;
        const coordinate = scope.coordinate ?? scaffold?.coordinate;
        if (coordinate === undefined) {
          throw new Error(`lowerPlots: coordinate scope "${scope.id}" must declare coordinate or inherit one from scaffold`);
        }
        return {
          id: scope.id,
          coordinate,
          ...(placement !== undefined ? { placement } : {}),
          ...(placement?.kind === 'track' ? { scaffold: placement.scaffold, track: placement.track } : {}),
        };
      }),
    };
  }
  if (node.coordinate === undefined) {
    throw new Error('lowerPlots: PlotSpec requires either coordinate shorthand or composition');
  }
  return {
    defaultScope: DEFAULT_COORDINATE_SCOPE_ID,
    scopes: [{ id: DEFAULT_COORDINATE_SCOPE_ID, coordinate: node.coordinate }],
  };
};

export const coordinateScopeIdOf = (
  operation: { coordinateScope?: string },
  defaultScope: string,
): string => operation.coordinateScope ?? defaultScope;

const axisGuideScopeIdOf = (guide: AxisGuide, defaultScope: string): string =>
  guide.coordinateScope ?? defaultScope;

const compositionAxisPolicyOf = (
  policy: CompositionGuidePolicy | undefined,
  context: { hasFacets: boolean; hasScaffolds: boolean },
): string =>
  policy?.axes ?? (context.hasFacets || context.hasScaffolds ? CompositionAxisPolicy.OuterShared : CompositionAxisPolicy.PerScope);

const compositionGridPlacementOf = (
  policy: CompositionGuidePolicy | undefined,
  context: { hasFacets: boolean; hasScaffolds: boolean },
): string =>
  policy?.gridPlacement ?? (!context.hasFacets && context.hasScaffolds ? CompositionGridPlacement.SharedRole : CompositionGridPlacement.Self);

const axisGapKeyOf = (guide: AxisGuide): string | null => {
  const placement = guide.placement;
  if (placement === undefined || placement.kind === 'auto') return null;
  if (placement.kind === 'side') return `side:${placement.side}`;
  return `edge:${placement.edge}`;
};

const withAxisGapOffsets = (guides: ReadonlyArray<Guide>, axisGap: number | undefined): Array<Guide> => {
  if (axisGap === undefined || axisGap === 0) return [...guides];
  const counts = new Map<string, number>();
  return guides.map(guide => {
    if (!isAxisGuide(guide)) return guide;
    const key = axisGapKeyOf(guide);
    if (key === null) return guide;
    const index = counts.get(key) ?? 0;
    counts.set(key, index + 1);
    if (index === 0 && (guide.placement?.kind === 'side' || guide.placement?.kind === 'edge')) return guide;
    if (guide.placement?.kind === 'side' || guide.placement?.kind === 'edge') {
      return {
        ...guide,
        placement: {
          ...guide.placement,
          offset: (guide.placement.offset ?? 0) + index * axisGap,
        },
      };
    }
    return guide;
  });
};

const withoutAxisGrid = (guides: ReadonlyArray<Guide>): Array<Guide> =>
  guides.map(guide => (isAxisGuide(guide) && guide.grid !== undefined ? { ...guide, grid: false } : guide));

const withEnabledAxisGrid = (guide: AxisGuide, coordinateScope: string | undefined): AxisGuide => ({
  ...guide,
  ...(coordinateScope !== undefined ? { coordinateScope } : {}),
  grid: true,
});

const mergeCompositionMargin = (
  padding: CompositionLayout['padding'] | undefined,
  margin: Partial<Margins> | undefined,
): Partial<Margins> | undefined => {
  if (padding === undefined) return margin;
  return { ...padding, ...margin };
};

const mergeContextMeta = (meta: IRJsonObject | undefined, context: IRJsonObject): IRJsonObject => ({
  ...(meta ?? {}),
  ...context,
});

const isIRScope = (child: IRChild): child is IRScope => child.type === 'scope' && 'children' in child;
const isIRNode = (child: IRChild): child is IRNode => child.type === 'node' && 'position' in child;
const isIRPath = (child: IRChild): child is IRPathBase => child.type === 'path' && 'children' in child;

const withScopeContext = (child: IRChild, context: IRJsonObject): IRChild => {
  if (Object.keys(context).length === 0) return child;
  if (isIRScope(child)) {
    return {
      ...child,
      meta: mergeContextMeta(child.meta, context),
      children: child.children.map(item => withScopeContext(item, context)),
    };
  }
  if (isIRNode(child)) return { ...child, meta: mergeContextMeta(child.meta, context) } satisfies IRNode;
  if (isIRPath(child)) return { ...child, meta: mergeContextMeta(child.meta, context) } satisfies IRPathBase;
  return child;
};

type FacetGrid = NonNullable<NonNullable<PlotSpec['composition']>['facets']>[number];
type FacetDimension = NonNullable<FacetGrid['row']>;
type FacetScalar = string | number | boolean | null;

type FacetPanel = {
  id: string;
  facet: FacetGrid;
  row: FacetScalar | undefined;
  column: FacetScalar | undefined;
  rowIndex: number;
  columnIndex: number;
  rows: Array<ExternalRow>;
};

const isFacetScalar = (value: unknown): value is FacetScalar =>
  value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const facetValueOf = (row: ExternalRow, field: string): FacetScalar => {
  const value = resolveFieldPath(row, field);
  if (value === undefined) throw new Error(`lowerPlots: facet field "${field}" is missing on a row`);
  if (!isFacetScalar(value)) {
    throw new Error(
      `lowerPlots: facet field "${field}" must resolve to a JSON scalar (string, number, boolean, or null)`,
    );
  }
  return value;
};

const facetValueKey = (value: FacetScalar | undefined): string => (value === undefined ? '' : JSON.stringify(value));

const orderedFacetValues = (
  dimension: FacetDimension | undefined,
  rows: ReadonlyArray<ExternalRow>,
): Array<FacetScalar | undefined> => {
  if (dimension === undefined) return [undefined];
  const out: Array<FacetScalar> = [];
  const seen = new Set<string>();
  const add = (value: FacetScalar): void => {
    const key = facetValueKey(value);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  };
  for (const value of dimension.order ?? []) add(value);
  for (const row of rows) add(facetValueOf(row, dimension.field));
  return out;
};

const defaultFacetPanelId = (
  facet: FacetGrid,
  row: FacetScalar | undefined,
  column: FacetScalar | undefined,
): string => {
  const parts = ['facet', facet.id];
  if (row !== undefined) parts.push('row', slug(row));
  if (column !== undefined) parts.push('column', slug(column));
  return parts.join('.');
};

const facetPanelId = (facet: FacetGrid, row: FacetScalar | undefined, column: FacetScalar | undefined): string => {
  const template = facet.scopeIdTemplate;
  if (template === undefined) return defaultFacetPanelId(facet, row, column);
  return template
    .replaceAll('{facet}', facet.id)
    .replaceAll('{row}', row === undefined ? '' : slug(row))
    .replaceAll('{column}', column === undefined ? '' : slug(column));
};

const resolveFacetPanels = (
  facet: FacetGrid,
  rows: ReadonlyArray<ExternalRow>,
  usedIds: Set<string>,
): Array<FacetPanel> => {
  const rowValues = orderedFacetValues(facet.row, rows);
  const columnValues = orderedFacetValues(facet.column, rows);
  const groups = new Map<string, Array<ExternalRow>>();
  for (const row of rows) {
    const rowValue = facet.row === undefined ? undefined : facetValueOf(row, facet.row.field);
    const columnValue = facet.column === undefined ? undefined : facetValueOf(row, facet.column.field);
    const key = `${facetValueKey(rowValue)}\u0000${facetValueKey(columnValue)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const panels: Array<FacetPanel> = [];
  for (const [rowIndex, rowValue] of rowValues.entries()) {
    for (const [columnIndex, columnValue] of columnValues.entries()) {
      const key = `${facetValueKey(rowValue)}\u0000${facetValueKey(columnValue)}`;
      const panelRows = groups.get(key) ?? [];
      if (panelRows.length === 0 && facet.empty !== 'show') continue;
      const id = facetPanelId(facet, rowValue, columnValue);
      if (usedIds.has(id)) throw new Error(`lowerPlots: facet panel scope id "${id}" is duplicated`);
      usedIds.add(id);
      panels.push({ id, facet, row: rowValue, column: columnValue, rowIndex, columnIndex, rows: panelRows });
    }
  }
  return panels;
};

/** 非位置 encoding key：这些键有专属语义，不参与 CoordinateDefinition.roles 校验。 */
const NON_POSITION_ENCODING_KEYS = new Set<string>(['color', 'text', 'channels']);

/**
 * 校验内置 mark 的 encoding key 是否属于当前坐标系角色。
 * @description schema 允许未知 key 承载自定义坐标系位置角色；lowering 必须按 active CoordinateDefinition.roles
 *   fail-loud，避免把 `size` / `opacity` 这类拼错或误放进 encoding 的字段静默当成无效位置角色。
 */
const assertKnownPositionEncodingRoles = (
  coordinateType: string,
  roles: ReadonlyArray<DimensionRole>,
  marks: ReadonlyArray<MarkOperation>,
): void => {
  const roleSet = new Set<string>(roles);
  for (const mark of marks) {
    if (!isBuiltinMark(mark)) continue;
    const encoding = markEncoding(mark);
    if (encoding === undefined) continue;
    for (const key of Object.keys(encoding)) {
      if (NON_POSITION_ENCODING_KEYS.has(key)) continue;
      if (!roleSet.has(key)) {
        throw new Error(
          `lowerPlots: ${coordinateType} coordinate system does not support encoding role "${key}" on ${mark.type} marks (valid roles: ${roles.join(', ')})`,
        );
      }
    }
  }
};

/**
 * 按坐标系合法集校验每根 axis guide 的 dimension（ADR-01，修 cross-review P2）
 * @description 非法 dimension（如 cartesian 下 'angle'）从「静默丢弃 / 渲杂散轴线」改 fail-loud，给清晰错误。
 */
const assertValidGuideDimensions = (
  coordinateType: string,
  roles: ReadonlyArray<DimensionRole>,
  axisGuides: Array<AxisGuide>,
): void => {
  const valid = roles;
  for (const guide of axisGuides) {
    if (!valid.includes(guide.dimension)) {
      throw new Error(
        `lowerPlots: ${coordinateType} coordinate system does not support axis dimension "${guide.dimension}" (valid dimensions: ${valid.join(', ')})`,
      );
    }
  }
};

/**
 * 按坐标系必填角色集校验每个位置 mark 的 encoding（ADR-01；x/y 转可选后必填性下放此处）
 * @description sector 无位置通道（角度来自累积界）→ 跳过；其余 mark 缺任一必填角色通道 → fail-loud。
 */
const assertRequiredPositionChannels = (
  coordinateType: string,
  roles: ReadonlyArray<DimensionRole>,
  marks: ReadonlyArray<MarkOperation>,
): void => {
  const required = roles;
  for (const mark of marks) {
    // 自定义 mark：必填位置通道由其 MarkDefinition.lower 自行 fail-loud，不在通用校验内强制
    if (!isBuiltinMark(mark)) continue;
    // reference 取向由 encoding.x XOR y 决定（绑一个、缺一个）；其取向校验在 lowerReference fail-loud
    if (mark.type === PlotMark.Reference || mark.type === PlotMark.Relation) continue;
    // interval：band / span bounds 需对应 encoding 位置通道；extent（字段区间）/ full（满域）从字段 / 坐标系取位置，豁免该角色
    if (mark.type === PlotMark.Interval) {
      const encoding = mark.encoding as Record<string, Channel | undefined>;
      for (const channel of required) {
        if (!intervalBoundConsumesRoleChannel(mark, channel)) continue;
        if (encoding[channel] === undefined) {
          throw new Error(
            `lowerPlots: ${coordinateType} coordinate system requires the "${channel}" position channel on ${mark.type} marks, but it is missing`,
          );
        }
      }
      continue;
    }
    // point / path：所有必填位置角色都要对应 encoding 通道
    const encoding = mark.encoding as Record<string, Channel | undefined>;
    for (const channel of required) {
      if (encoding[channel] === undefined) {
        throw new Error(
          `lowerPlots: ${coordinateType} coordinate system requires the "${channel}" position channel on ${mark.type} marks, but it is missing`,
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
  /** Runtime-only functions referenced by AnchorIdSpec.generator; PlotSpec stores only generator keys. */
  anchorIdGenerators?: Record<string, AnchorIdGenerator>;
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
   * 自定义统计 reducer definition 数组（运行时函数，不进 IR）：summarize / annotate / bin 的 `{op:<customOp>, ...config}` 据此校验并规约。
   * @description 内置 reducer 恒可用；自定义 op 未注册 / op 冲突会 fail-loud。
   */
  statisticsReducerDefinitions?: Array<AnyStatisticsReducerDefinition>;
  /**
   * 自定义 row selector definition 数组（运行时函数，不进 IR）：select / annotate / relate 的 `{op:<customOp>, ...config}` 据此校验并选择代表行。
   * @description 内置 selector 恒可用；自定义 op 未注册 / op 冲突会 fail-loud。
   */
  rowSelectorDefinitions?: Array<AnyRowSelectorDefinition>;
  /**
   * 自定义 scale definition 数组（运行时函数，不进 IR）：spec.scales 的 `{type:<customType>, name, ...config}` 据此校验并解析。
   * @description 内置 13 个 scale 恒可用；自定义 type 未注册 / type 冲突会 fail-loud。position 族喂 coordinate 投影 + guide，channel 族喂 color 通道 + legend。
   */
  scaleDefinitions?: Array<AnyScaleDefinition>;
  /**
   * 自定义通道 definition 数组（运行时函数，不进 IR）：所有通道类型共用 registry。
   * @description 内置通道（position / mark / node / path）恒可用；自定义 `channel` 撞内置名 / 互撞 / 缺必要行为 → fail-loud。
   */
  channelDefinitions?: Array<AnyChannelDefinition>;
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
  /**
   * 自定义字段解析格式 definition 数组（运行时函数，不进 IR）：data.model 的 `{name, format:<customName>}` 据此解析。
   * @description 内置 6 个 format 恒可用；自定义 name 未注册 / name 冲突会 fail-loud。definition 给出 impliedType（覆盖推断 / 冲突校验）与 parse（原始值 → canonical）。
   */
  formatDefinitions?: Array<FieldFormatDefinition>;
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
  fieldTypes: PlotFieldTypeMap;
  /** 整图宽（user units） */
  width: number;
  /** 整图高（user units） */
  height: number;
  /** label 字号 */
  fontSize: number;
  /** guide title / composition label 固定间距。 */
  labelGap?: number;
  /** 逐边覆盖自动估算的 margin */
  margin?: Partial<Margins>;
  /** overlay scope 共享 target scope 的 plotArea；省略时由坐标系自行计算。 */
  plotAreaOverride?: Rect;
  /** 指定 role 的最终 range；用于 scaffold track 把局部 role 映射进 track band。 */
  roleRangeOverrides?: Partial<Record<DimensionRole, readonly [number, number]>>;
  /** provenance 上下文（开 → guide 层带 `<plotId>.` id + 来源 meta；undefined → alpha.2 行为） */
  provenance?: ProvenanceContext;
  /** 自定义坐标系 definition 数组（运行时函数，不进 IR）；coordinate {type:<customType>, ...config} 据此解析投影 */
  coordinates?: Array<AnyCoordinateDefinition>;
  /** scale registry（内置 13 + 自定义 scaleDefinitions）；position 投影 / channel 取色 / compat 共用单一真源，保 locator parity */
  scaleRegistry: Map<string, AnyScaleDefinition>;
  /** 每个 mark 实际使用的数据视图；普通 mark 用全图 rows，relation 可使用 mark-scoped transform rows。 */
  markDataViews?: Array<MarkDataView>;
  roleMarkDataViews?: Record<string, Array<MarkDataView>>;
};

/**
 * 按坐标系解析出 mark / guide 共用的投影帧 + 下沉 guide 层
 * @description cartesian：x/y 角色绑 x/y scale、走 plotArea + 直线轴；polar：angle/radius 角色、走 polar layout + 弧 / 辐条轴。
 *   抽成纯函数使 mark 下沉与 ADR-02 locator 共用同一投影（杜绝两套投影漂移）；产物与内联版等价。
 */
export const resolveFrame = (params: ResolveFrameParams): CoordinateFrameResolution => {
  const {
    node,
    rows,
    fieldTypes,
    width,
    height,
    fontSize,
    labelGap,
    margin,
    plotAreaOverride,
    roleRangeOverrides,
    provenance,
    coordinates,
    scaleRegistry,
  } = params;
  const markDataViews = params.markDataViews ?? node.marks.map(mark => ({ mark, rows }));
  const markDataViewsForRole = (role: DimensionRole): Array<MarkDataView> =>
    params.roleMarkDataViews?.[role] ?? markDataViews;
  const registry = resolveCoordinateScopeRegistry(node);
  const coordinateOperation = node.coordinate ?? registry.scopes.find(scope => scope.id === registry.defaultScope)?.coordinate;
  if (coordinateOperation === undefined) {
    throw new Error(`lowerPlots: default coordinate scope "${registry.defaultScope}" is not registered`);
  }
  const coordinateRegistry = resolveCoordinateRegistry(coordinates);
  const coordinateDefinition = coordinateRegistry.get(coordinateOperation.type);
  if (coordinateDefinition === undefined) {
    throw new Error(
      `lowerPlots: coordinate type "${coordinateOperation.type}" is not registered; pass a CoordinateDefinition via options.coordinates`,
    );
  }
  const roles = coordinateDefinition.roles;
  const axisGuides = (node.guides ?? []).filter(isAxisGuide);
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  const positionChannels = createPositionChannelDefinitions(roles);

  // ADR-01 校验（建 frame 前）：guide 维度按坐标系合法集校验 + mark 必填位置角色校验，均 fail-loud。
  assertValidGuideDimensions(coordinateOperation.type, roles, axisGuides);
  assertKnownPositionEncodingRoles(coordinateOperation.type, roles, node.marks);
  assertRequiredPositionChannels(coordinateOperation.type, roles, node.marks);

  // 收集某角色（位置 scale 名 + 通道角色）下所有 mark 的通道原始值（不预过滤）：
  //   连续 scale 内部过滤为有限数求 extent、分类 scale 按数据序去重推断 domain。
  // role 决定从哪个通道取值：cartesian 用 x/y；polar 用 angle??x / radius??y（mark 不写死笛卡尔）。
  const collectValues = (
    role: DimensionRole,
    axis: 'primary' | 'secondary' | undefined,
    pick: (mark: MarkOperation) => Channel | undefined,
    includeBaseline: boolean,
  ): Array<unknown> => {
    const out: Array<unknown> = [];
    const sourceViews = markDataViewsForRole(role);
    for (const { mark, rows: markRows } of sourceViews) {
      out.push(...relationTargetRoleValues(mark, role, markRows));
      // interval：域贡献按 bounds 来源（band/span → 位置通道值、extent → 两字段、full → 不贡献），统一替代旧 histogram / stack / sector 特判
      if (isBuiltinMark(mark) && mark.type === PlotMark.Interval && axis !== undefined) {
        out.push(...intervalRoleValues(mark, axis, pick, markRows));
        continue;
      }
      const channel = pick(mark);
      if (channel === undefined) continue;
      for (const row of markRows) {
        out.push(channelValue(channel, row));
      }
    }
    // 值轴从 baseline 起：interval span / extent 按实际 role 纳入 0；path closure 仍由调用方显式请求。
    if (
      axis !== undefined &&
      node.marks.some(
        mark => isBuiltinMark(mark) && mark.type === PlotMark.Interval && intervalContributesBaseline(mark, axis),
      )
    )
      out.push(0);
    if (includeBaseline) {
      for (const mark of node.marks) {
        if (isBuiltinMark(mark) && mark.type === PlotMark.Path) {
          if (mark.closure?.kind === PathClosureKind.Baseline) {
            out.push(mark.closure.baseline ?? 0);
          } else if (mark.closure?.kind === PathClosureKind.Stack) {
            const markRows = sourceViews.find(view => view.mark === mark)?.rows ?? rows;
            for (const row of markRows) out.push(resolveFieldPath(row, mark.closure.baselineField));
          }
        }
      }
    }
    return out;
  };

  const collectAxisTicks = (role: DimensionRole): TickSet | undefined => {
    const hasRegularRoleTicks = node.marks.some(mark => {
      const channel = markEncoding(mark)?.[role];
      if (channel === undefined) return false;
      return !(isBuiltinMark(mark) && mark.type === PlotMark.Interval && !intervalBoundConsumesRoleChannel(mark, role));
    });
    if (hasRegularRoleTicks) return undefined;
    const values: TickSet['values'] = [];
    const labels: TickSet['labels'] = [];
    for (const { mark, rows: markRows } of markDataViewsForRole(role)) {
      if (!isBuiltinMark(mark) || mark.type !== PlotMark.Interval) continue;
      const ticks = intervalProportionalAxisTicks(mark, role, markRows);
      if (ticks === undefined) continue;
      values.push(...ticks.values);
      labels.push(...ticks.labels);
    }
    return values.length > 0 ? { values, labels } : undefined;
  };

  // 某角色（跨所有 mark）绑定字段的全部类型——多 mark 共用一角色时须校验 / 派生全部，不能只看首个
  const roleFieldTypes = (
    role: DimensionRole,
    pick: (mark: MarkOperation) => Channel | undefined,
  ): Array<PlotFieldTypeValue> => {
    const types: Array<PlotFieldTypeValue> = [];
    for (const mark of node.marks) {
      if (isBuiltinMark(mark) && mark.type === PlotMark.Interval && !intervalBoundConsumesRoleChannel(mark, role))
        continue;
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
  const resolveRoleOrder = (
    role: DimensionRole,
    pick: (mark: MarkOperation) => Channel | undefined,
  ): CategoryOrder | undefined => {
    const found: Array<CategoryOrder> = [];
    for (const mark of node.marks) {
      if (isBuiltinMark(mark) && mark.type === PlotMark.Interval && !intervalBoundConsumesRoleChannel(mark, role))
        continue;
      const channel = pick(mark);
      if (channel?.field === undefined) continue;
      const order = fieldOrders.get(channel.field);
      if (order === undefined || order === 'data') continue;
      const type = fieldTypes.get(channel.field);
      if (type !== undefined && type !== PlotFieldType.Categorical) {
        throw new Error(
          `lowerPlots: field "${channel.field}" has order but its type is ${type}, not categorical; order only applies to categorical fields`,
        );
      }
      found.push(order);
    }
    if (found.length === 0) return undefined;
    const distinct = [...new Set(found.map(order => JSON.stringify(order)))];
    if (distinct.length > 1) {
      throw new Error(
        `lowerPlots: coordinate.${role} binds fields with conflicting orders; give the scale an explicit domain`,
      );
    }
    return found[0];
  };

  // 解析角色 scale（ADR-03）：显式绑定 → 查表（未声明仍抛，typo 守卫）+ 对该 role **全部**字段做兼容校验；
  //   省略 → 按字段类型派生（要求该 role 字段类型一致，混类型 fail-loud）。兼容校验只对「声明 model 的类型」生效。
  const resolveScaleForRole = (
    role: DimensionRole,
    scaleName: string | undefined,
    pick: (mark: MarkOperation) => Channel | undefined,
    values: Array<unknown>,
  ): ScaleOperation => {
    const types = roleFieldTypes(role, pick);
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
        throw new Error(
          `lowerPlots: coordinate.${role} omitted but its bound fields have mixed types [${distinct.join(', ')}]; declare an explicit scale`,
        );
      }
      def = deriveScale(distinct[0], `__${role}`);
    }
    // order 注入：仅当字段有非默认 order 且该 scale 是内置 band/point 且 domain 未显式给（显式 domain 优先、压过 order）
    if (
      order !== undefined &&
      isBuiltinScaleOperation(def) &&
      (def.type === PlotScale.Band || def.type === PlotScale.Point) &&
      def.domain === undefined
    ) {
      return { ...def, domain: orderedCategoryDomain(values, order) };
    }
    return def;
  };

  const roleChannelOf = (role: DimensionRole) => {
    const def = positionChannels.get(role);
    if (def === undefined) {
      throw new Error(
        `lowerPlots: ${coordinateOperation.type} coordinate system does not support encoding role "${role}" (valid roles: ${roles.join(', ')})`,
      );
    }
    return def.pickWithOptions();
  };

  const resolveScaleForDefinitionRole = (
    role: DimensionRole,
    scaleName: string | undefined,
    values: Array<unknown>,
  ): ScaleOperation => resolveScaleForRole(role, scaleName, roleChannelOf(role), values);

  // legend 预留：按 position 在对应边让出带宽，plotArea 据此收窄（决策 ⑩）
  const legendReserve = legendReserveOf((node.guides ?? []).filter(isLegendGuide));

  JsonObjectSchema.parse(coordinateOperation);
  const parsedCoordinateOperation = coordinateDefinition.schema.parse(coordinateOperation) as never;
  JsonObjectSchema.parse(parsedCoordinateOperation);
  const resolution = coordinateDefinition.resolve(parsedCoordinateOperation, {
    width,
    height,
    fontSize,
    ...(labelGap !== undefined ? { labelGap } : {}),
    ...(margin !== undefined ? { margin } : {}),
    legendReserve,
    ...(plotAreaOverride !== undefined ? { plotAreaOverride } : {}),
    ...(roleRangeOverrides !== undefined ? { roleRangeOverrides } : {}),
    ...(provenance !== undefined ? { provenance } : {}),
    collectRoleValues: (role, opts) =>
      collectValues(role, undefined, roleChannelOf(role), opts?.includeBaseline ?? false),
    collectPositionValues: (role, opts) =>
      collectValues(role, opts?.axis, roleChannelOf(role), opts?.includeBaseline ?? false),
    collectAxisTicks,
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
 * 收集所有 mark 在某非位置通道上的字段 descriptor（size / opacity / shape）
 * @description resolver 双产出的 descriptor 注册到 channel → descriptor 表；同通道多 mark 取首个有 descriptor 的
 *   （legend 据 scale name 消歧留待多 scale 场景，alpha.8 这三通道用合成默认 scale，不暴露具名）。
 */
const collectChannelDescriptors = (
  node: PlotSpec,
  channelCtx: {
    node: PlotSpec;
    rows: Array<ExternalRow>;
    fieldTypes: PlotFieldTypeMap;
    scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>;
    resolveColorScheme: (name: string) => (t: number) => string;
  },
  channelRegistry: ReadonlyMap<string, AnyChannelDefinition>,
  markRegistry: ReadonlyMap<string, AnyMarkDefinition>,
  markDataViews?: ReadonlyArray<MarkDataView>,
): Array<ScaleDescriptor> => {
  const out: Array<ScaleDescriptor> = [];
  const register = (descriptor: ScaleDescriptor | undefined): void => {
    if (descriptor) out.push(descriptor);
  };
  for (const view of markDataViews ?? node.marks.map(mark => ({ mark, rows: channelCtx.rows }))) {
    const markChannels = resolveMarkChannels(
      view.mark,
      { ...channelCtx, rows: view.rows },
      channelRegistry,
      DEFAULT_PLOT_COLORS[0],
      channelKindsForMark(view.mark, markRegistry),
    );
    for (const descriptor of markChannels.descriptors ?? []) register(descriptor);
  }
  return out;
};

const selectLegendDescriptor = (
  guide: LegendGuide,
  descriptors: ReadonlyArray<ScaleDescriptor>,
  scaleByName: ReadonlyMap<string, ScaleOperation>,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
): ScaleDescriptor | undefined => {
  const matched = descriptors.filter(
    descriptor =>
      descriptor.channel === guide.channel && (guide.scale === undefined || descriptor.scaleName === guide.scale),
  );
  if (guide.scale !== undefined) {
    if (matched.length === 0) {
      const scale = scaleByName.get(guide.scale);
      if (scale === undefined) throw new Error(`lowerPlots: legend references unknown scale "${guide.scale}"`);
      const scaleDefinition = scaleRegistry.get(scale.type);
      if (scaleDefinition?.family !== 'channel') {
        throw new Error(
          `lowerPlots: scale "${guide.scale}" is not a color scale (legend channel "${guide.channel}" can only bind channel scales)`,
        );
      }
      throw new Error(`lowerPlots: legend channel "${guide.channel}" has no bound scale named "${guide.scale}"`);
    }
    return matched[0];
  }
  const signatures = new Set(
    matched.map(
      descriptor => descriptor.scaleName ?? `${descriptor.channel}:${descriptor.field ?? ''}:${descriptor.scaleType}`,
    ),
  );
  if (signatures.size > 1) {
    throw new Error(
      `lowerPlots: legend channel "${guide.channel}" is driven by multiple scales [${[...signatures].join(', ')}]; specify which via the legend "scale" field`,
    );
  }
  return matched[0];
};

/** 数值刻度 nice 化 + 格式化：复用 axis 的 scaleTicks 链（决策 ⑨），domain → {value, offset 0..1, label} */
const niceNumericTicks = (
  domain: readonly [number, number],
  count: number,
): Array<{ value: number; offset: number; label: string }> => {
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
const resolveSqrtForLegend = (
  domain: readonly [number, number],
  range: readonly [number, number],
): ((value: number) => number) => {
  const scale = resolveSqrtScale(
    {
      type: PlotScale.Sqrt,
      name: '__legend_size',
      domain: [Math.max(0, domain[0]), domain[1]],
      range: [range[0], range[1]],
    },
    [],
    range,
  );
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
 * color legend 解析：消费 channel definition 产出的 colorScale descriptor → 按 legendForm 选 swatch / ramp / 分箱
 * @description legendForm='ramp'（sequential / diverging）→ core linearGradient 连续色带 + nice 刻度；
 *   legendForm='swatch' + edges（quantize/threshold/quantile）→ 每档区间 swatch（区间标签闭开口契约）；
 *   legendForm='swatch' 无 edges（ordinal）→ 逐类别色块 swatch。evaluator / domain / range 来自实绘解析结果。
 */
const resolveColorLegend = (
  descriptor: ScaleDescriptor,
  guide: LegendGuide,
  baseInput: LegendBaseInput,
  showLabels: boolean,
): LegendInput => {
  // 标题只在用户显式给时渲染（field 名仅作占位 fallback 的语义来源，不自动生成标题 Node，避免与条目标签混淆）
  const title = guide.title;
  const resolution = descriptor.colorScale;
  if (resolution === undefined) {
    throw new Error(
      `lowerPlots: legend channel "${guide.channel}" has no color scale descriptor; cannot derive a color legend`,
    );
  }

  // 连续色带 ramp：sequential / diverging（沿带等距采样色 + nice 刻度；domain = resolution.domain [lo, hi]）
  if (resolution.legendForm === 'ramp') {
    const lo = Number(resolution.domain[0]);
    const hi = Number(resolution.domain[resolution.domain.length - 1]);
    const STOP_COUNT = 8;
    const stops = Array.from({ length: STOP_COUNT }, (_unused, index) => {
      const t = index / (STOP_COUNT - 1);
      return { offset: t, color: resolution.of(lo + (hi - lo) * t) ?? '' };
    });
    const ticks = showLabels
      ? niceNumericTicks([lo, hi], guide.tickCount ?? DEFAULT_TICK_COUNT).map(tick => ({
          offset: tick.offset,
          label: tick.label,
        }))
      : [];
    return { ...baseInput, form: 'ramp', title, entries: [], ramp: { stops, ticks } };
  }

  // 分箱 swatch：quantize / threshold / quantile → 每档色块 + 区间标签（闭开口：[a, b)，末档闭）；edges = 档间内部边界
  if (resolution.edges !== undefined) {
    const edges = resolution.edges;
    const colors = resolution.range;
    const formatNumber = resolveLinearScale(
      { domain: edges.length > 0 ? [edges[0], edges[edges.length - 1]] : [0, 1] },
      [],
      [0, 1],
    ).tickFormat();
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
  const entries: Array<LegendEntry> = resolution.domain.map(
    (category, index): LegendEntry => ({ label: showLabels ? String(category) : '', color: resolution.range[index] }),
  );
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
  const reserve: { right: number; left: number; top: number; bottom: number } = {
    right: 0,
    left: 0,
    top: 0,
    bottom: 0,
  };
  for (const guide of legendGuides) {
    reserve[guide.position ?? 'right'] += LEGEND_BAND_EXTENT;
  }
  return reserve;
};

/**
 * 为每个 legend 计算预留带矩形（落在 plotArea 旁的预留 gutter 内；同侧按声明序堆叠）
 * @description gutter 由 computePlotArea 在对应边按 legendReserveOf 让出；此处把每个 legend 摆进其所在边的带。
 */
const reserveLegendBands = (
  legendGuides: Array<LegendGuide>,
  width: number,
  height: number,
  plotArea: Rect,
): Array<Rect> => {
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
        return {
          x: plotArea.x + offset,
          y: 4,
          width: LEGEND_BAND_EXTENT,
          height: Math.max(0, plotArea.y - 4 - LEGEND_CONTENT_GAP),
        };
      case 'bottom':
        return {
          x: plotArea.x + offset,
          y: plotBottom + LEGEND_CONTENT_GAP,
          width: LEGEND_BAND_EXTENT,
          height: Math.max(0, height - plotBottom - LEGEND_CONTENT_GAP),
        };
      default:
        return {
          x: plotRight + LEGEND_CONTENT_GAP,
          y: plotArea.y + offset,
          width: Math.max(0, width - plotRight - LEGEND_CONTENT_GAP),
          height,
        };
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
  channelDescriptors: ReadonlyArray<ScaleDescriptor>,
  legendGuides: Array<LegendGuide>,
  fontSize: number,
  bands: Array<Rect>,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
): Array<IRScope> => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return legendGuides.map((guide, legendIndex): IRScope => {
    const band = bands[legendIndex] ?? { x: 0, y: 0, width: 0, height: 0 };
    const orient =
      guide.orient ?? (guide.position === 'top' || guide.position === 'bottom' ? 'horizontal' : 'vertical');
    const id = legendGuides.length > 1 ? `legend.${guide.channel}.${legendIndex}` : `legend.${guide.channel}`;
    const baseInput: LegendBaseInput = {
      channel: guide.channel,
      position: guide.position ?? 'right',
      orient,
      fontSize,
      band,
      id,
    };
    const showLabels = guide.tickLabels !== false;
    const descriptor = selectLegendDescriptor(guide, channelDescriptors, scaleByName, scaleRegistry);

    if (descriptor?.colorScale !== undefined) {
      const input = resolveColorLegend(descriptor, guide, baseInput, showLabels);
      return lowerLegend(input);
    }
    if (guide.channel === 'color') {
      throw new Error(
        'lowerPlots: legend channel "color" has no bound color scale; bind a color encoding with a scale or give the legend an explicit scale',
      );
    }
    // size / opacity / shape：从 resolver descriptor 取
    if (!descriptor) {
      throw new Error(
        `lowerPlots: legend channel "${guide.channel}" has no bound scale (no mark encodes ${guide.channel} by field); cannot derive a legend`,
      );
    }
    // 标题只在用户显式给时渲染（见 resolveColorLegend 同注）
    const title = guide.title;
    if (guide.channel === 'shape') {
      const entries: Array<LegendEntry> = descriptor.domain.map((category, index) => ({
        label: showLabels ? String(category) : '',
        shape: String(descriptor.range[index]),
        color: 'currentColor',
      }));
      return lowerLegend({ ...baseInput, form: 'swatch', title, entries });
    }
    if (guide.channel === 'size') {
      const [lo, hi] = [Number(descriptor.domain[0]), Number(descriptor.domain[descriptor.domain.length - 1])];
      const ticks = niceNumericTicks([lo, hi], guide.tickCount ?? 3).filter(tick => tick.value > 0);
      const reps = ticks.length > 0 ? ticks : [{ value: hi, offset: 1, label: String(hi) }];
      // 半径据 descriptor range（与 mark 实绘同源）线性插值（sqrt domain→radius）
      const [rMin, rMax] = [Number(descriptor.range[0]), Number(descriptor.range[descriptor.range.length - 1])];
      const radiusScale = resolveSqrtForLegend([lo, hi], [rMin, rMax]);
      const entries: Array<LegendEntry> = reps.map(tick => ({
        label: showLabels ? tick.label : '',
        radius: radiusScale(tick.value),
      }));
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

const resolveMarkRows = (
  mark: MarkOperation,
  rows: Array<ExternalRow>,
  transformRegistry: ReadonlyMap<string, AnyTransformDefinition>,
  transformContext: TransformContext,
): Array<ExternalRow> => {
  const transform = (mark as { transform?: Array<TransformOperation> }).transform;
  if (transform === undefined) return rows;
  return applyTransforms(rows, transform, transformRegistry, transformContext);
};

/**
 * 校验 fieldMaps（fail-loud）：ref∈datasets；本 plot 的 map 需 model + 逻辑名∈model
 * @description 抽出供 expandPlot 与 createPlotLocator 共用，保证「render 抛错 ⟺ locator 抛错」的 parity（评审 P2）
 */
export const validateFieldMaps = (
  spec: PlotSpec,
  datasets: ExternalDatasets,
  fieldMaps: LowerPlotsOptions['fieldMaps'],
): void => {
  if (fieldMaps === undefined) return;
  for (const ref of Object.keys(fieldMaps)) {
    if (!(ref in datasets)) throw new Error(`lowerPlots: fieldMaps references unknown dataset "${ref}"`);
  }
  if (!(spec.data.reference in fieldMaps)) return;
  const fieldMap = fieldMaps[spec.data.reference];
  if (spec.data.model === undefined) {
    throw new Error(
      `lowerPlots: fieldMaps for "${spec.data.reference}" requires data.model (no logical field contract without a model)`,
    );
  }
  const declared = new Set(spec.data.model.map(field => field.name));
  for (const logical of Object.keys(fieldMap)) {
    if (!declared.has(logical)) {
      throw new Error(
        `lowerPlots: fieldMaps["${spec.data.reference}"] maps unknown logical field "${logical}" (not in data.model)`,
      );
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
): {
  fieldTypes: PlotFieldTypeMap;
  normalized: Array<ExternalRow>;
  transformRegistry: Map<string, AnyTransformDefinition>;
  transformContext: TransformContext;
  scaleRegistry: Map<string, AnyScaleDefinition>;
  markRegistry: Map<string, AnyMarkDefinition>;
} => {
  validateFieldMaps(spec, datasets, options.fieldMaps);
  const transformRegistry = resolveTransformRegistry(options.transformDefinitions);
  const transformContext: TransformContext = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    statisticsReducerRegistry: resolveStatisticsReducerRegistry(options.statisticsReducerDefinitions),
    rowSelectorRegistry: resolveRowSelectorRegistry(options.rowSelectorDefinitions),
  };
  const scaleRegistry = resolveScaleRegistry(options.scaleDefinitions);
  const markRegistry = resolveMarkRegistry(options.markDefinitions);
  const userSourceFields = collectSourceFields(spec, transformRegistry, markRegistry, transformContext);
  // strict + 声明/推断（ADR-01/05）；strict 在 applyFieldResolver 之前先校验，resolver 不绕过（ADR-04）
  const baseTypes = resolveFieldTypes(spec.data.model, ingested, userSourceFields);
  const fieldMap = options.fieldMaps?.[spec.data.reference];
  // 声明式 format（ADR-06 内置 + ADR-09 自定义 registry）：format 经 registry 解析出 definition，蕴含 type 覆盖推断 + 冲突 / 未注册 fail-loud + 收集 parser；
  //   置于 resolveField 之前，使 resolveField 仍胜出
  const formatRegistry = resolveFormatRegistry(options.formatDefinitions);
  const { fieldTypes: formatTypes, parsers: formatParsers } = collectFormatFields(
    spec.data.model,
    baseTypes,
    userSourceFields,
    formatRegistry,
  );
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
  return { fieldTypes, normalized, transformRegistry, transformContext, scaleRegistry, markRegistry };
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
  const provenanceEnabled =
    options.provenance === true || options.datumProvenance === true || options.datumIdField !== undefined;
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
  const { fieldTypes, normalized, transformRegistry, transformContext, scaleRegistry, markRegistry } = prepareRows(
    node,
    datasets,
    options,
    ingested,
  );
  // scheme 解析器：内置 scheme + options.colorSchemes；channel scale 取色 / legend ramp 共用。
  const resolveColorScheme = makeColorSchemeResolver(options.colorSchemes);
  if (options.validateData) {
    const sampleRows = typeof options.validateData === 'object' ? (options.validateData.sampleRows ?? 100) : 100;
    validateBoundData(normalized, fieldTypes, sampleRows);
  }
  // invalid:'error'（ADR-08）：transform 之前对 spec 参与字段（= fieldTypes 键）全量校验，遇任一非法 / 缺失 fail-loud；
  //   置于 transform 前 → 错误定位到原始源字段、不被 transform 改写干扰。默认 'skip' 不校验（哨兵留给下游跳）。
  if (options.invalid === 'error') {
    assertAllValuesValid(normalized, fieldTypes);
  }

  const rows = applyTransforms(normalized, node.transform, transformRegistry, transformContext);
  const markDataViews: Array<MarkDataView> = node.marks.map(mark => ({
    mark,
    rows: resolveMarkRows(mark, rows, transformRegistry, transformContext),
  }));

  const compositionLayout = node.composition?.layout;
  const compositionFacets = node.composition?.facets ?? [];
  const compositionScaffolds = node.composition?.scaffolds ?? [];
  const compositionGuidePolicy = node.composition?.guidePolicy;
  const compositionPolicyContext = {
    hasFacets: compositionFacets.length > 0,
    hasScaffolds: compositionScaffolds.length > 0,
  };
  const compositionAxisPolicy = compositionAxisPolicyOf(compositionGuidePolicy, compositionPolicyContext);
  const compositionGridPlacement = compositionGridPlacementOf(compositionGuidePolicy, compositionPolicyContext);
  const frameMargin = mergeCompositionMargin(compositionLayout?.padding, options.margin);
  const allGuides = withAxisGapOffsets(node.guides ?? [], compositionLayout?.axisGap);
  const coordinateScopes = resolveCoordinateScopeRegistry(node);
  const scopeById = new Map(coordinateScopes.scopes.map(scope => [scope.id, scope] as const));
  const scopeContextOf = (scope: CoordinateScopeRegistryEntry): IRJsonObject => {
    if (node.composition === undefined) return {};
    const context: IRJsonObject = { coordinateScope: scope.id };
    if (scope.placement?.kind === 'track') {
      context.scaffold = scope.placement.scaffold;
      context.track = scope.placement.track;
    }
    return context;
  };
  const scaffoldById = new Map(compositionScaffolds.map(scaffold => [scaffold.id, scaffold] as const));
  const coordinateRegistry = resolveCoordinateRegistry(options.coordinates);
  const rolesOf = (coordinate: CoordinateOperation): ReadonlySet<DimensionRole> => {
    const definition = coordinateRegistry.get(coordinate.type);
    if (definition === undefined) {
      throw new Error(
        `lowerPlots: coordinate type "${coordinate.type}" is not registered; pass a CoordinateDefinition via options.coordinates`,
      );
    }
    return new Set(definition.roles);
  };
  const assertScaffoldRole = (role: DimensionRole, roles: ReadonlySet<DimensionRole>, scaffoldId: string): void => {
    if (!roles.has(role)) {
      throw new Error(`lowerPlots: scaffold "${scaffoldId}" shared role "${role}" is not supported by its coordinate`);
    }
  };
  const assertTrackRole = (role: DimensionRole, roles: ReadonlySet<DimensionRole>, scopeId: string): void => {
    if (!roles.has(role)) {
      throw new Error(`lowerPlots: coordinate scope "${scopeId}" track band role "${role}" is not supported by its coordinate`);
    }
  };
  const roleRangeOf = (
    frameResolution: CoordinateFrameResolution,
    role: DimensionRole,
    context: string,
  ): readonly [number, number] => {
    const range = frameResolution.frame.roleScales?.[role]?.range();
    if (range === undefined) {
      throw new Error(`lowerPlots: ${context} does not expose a scale range for role "${role}"`);
    }
    return range;
  };
  const trackIndexOf = (scaffold: SharedScaffold, track: ScaffoldTrack): { index: number; count: number } => {
    const ordered = scaffold.tracks
      .filter(candidate => candidate.band.role === track.band.role)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.band.start - b.band.start || a.band.end - b.band.end);
    return { index: ordered.findIndex(candidate => candidate.id === track.id), count: ordered.length };
  };
  const bandRangeOf = (
    range: readonly [number, number],
    track: ScaffoldTrack,
    scaffold: SharedScaffold,
  ): readonly [number, number] => {
    const delta = range[1] - range[0];
    const start = range[0] + delta * track.band.start;
    const end = range[0] + delta * track.band.end;
    const gap = compositionLayout?.trackGap ?? 0;
    if (gap === 0) return [start, end];
    const { index, count } = trackIndexOf(scaffold, track);
    const direction = delta >= 0 ? 1 : -1;
    const adjustedStart = start + (index > 0 ? direction * (gap / 2) : 0);
    const adjustedEnd = end - (index >= 0 && index < count - 1 ? direction * (gap / 2) : 0);
    if ((delta >= 0 && adjustedStart >= adjustedEnd) || (delta < 0 && adjustedStart <= adjustedEnd)) {
      throw new Error(`lowerPlots: trackGap ${gap} leaves no range for track "${track.id}"`);
    }
    return [adjustedStart, adjustedEnd];
  };
  const trackScopesByScaffold = new Map<string, Array<CoordinateScopeRegistryEntry>>();
  for (const scope of coordinateScopes.scopes) {
    if (scope.placement?.kind !== 'track') continue;
    const entries = trackScopesByScaffold.get(scope.placement.scaffold) ?? [];
    entries.push(scope);
    trackScopesByScaffold.set(scope.placement.scaffold, entries);
  }
  type AxisGridConfig = Exclude<NonNullable<AxisGuide['grid']>, boolean>;
  type GridTargetSelector = NonNullable<AxisGridConfig['select']>;
  const axisGridApplyToOf = (guide: AxisGuide): string | null => {
    if (guide.grid === undefined || guide.grid === false) return null;
    if (guide.grid === true) return compositionGridPlacement;
    return guide.grid.applyTo ?? compositionGridPlacement;
  };
  const axisGridSelectorOf = (guide: AxisGuide): GridTargetSelector | undefined =>
    typeof guide.grid === 'object' ? guide.grid.select : undefined;
  const scalarSelectorIncludes = (
    values: ReadonlyArray<FacetScalar> | undefined,
    value: FacetScalar | undefined,
  ): boolean => values === undefined || (value !== undefined && values.some(candidate => facetValueKey(candidate) === facetValueKey(value)));
  const coordinateScaleNameOf = (scope: CoordinateScopeRegistryEntry, role: DimensionRole): string | undefined => {
    const value = (scope.coordinate as Record<string, unknown>)[role];
    return typeof value === 'string' ? value : undefined;
  };
  const scopeSharesAxisRole = (
    source: CoordinateScopeRegistryEntry,
    target: CoordinateScopeRegistryEntry,
    dimension: DimensionRole,
  ): boolean => {
    if (source.id === target.id) return true;
    if (source.placement?.kind === 'track' && target.placement?.kind === 'track') {
      if (source.placement.scaffold === target.placement.scaffold) {
        const scaffold = scaffoldById.get(source.placement.scaffold);
        if (scaffold?.sharedRoles.includes(dimension)) return true;
      }
    }
    const sourceScale = coordinateScaleNameOf(source, dimension);
    const targetScale = coordinateScaleNameOf(target, dimension);
    return sourceScale !== undefined && sourceScale === targetScale;
  };
  const selectorMatchesScope = (selector: GridTargetSelector, scope: CoordinateScopeRegistryEntry): boolean => {
    if (selector.scopes?.includes(scope.id)) return true;
    if (selector.track !== undefined && scope.placement?.kind === 'track') {
      const scaffoldMatches = selector.track.scaffold === undefined || selector.track.scaffold === scope.placement.scaffold;
      const trackMatches = selector.track.id === undefined || selector.track.id.includes(scope.placement.track);
      return scaffoldMatches && trackMatches;
    }
    return false;
  };
  const axisGridTargetsScope = (guide: AxisGuide, scope: CoordinateScopeRegistryEntry): boolean => {
    const applyTo = axisGridApplyToOf(guide);
    if (applyTo === null) return false;
    const sourceScope = scopeById.get(axisGuideScopeIdOf(guide, coordinateScopes.defaultScope));
    if (sourceScope === undefined) return false;
    if (applyTo === AxisGridApplyTo.Self) return sourceScope.id === scope.id;
    if (applyTo === AxisGridApplyTo.SharedRole) return scopeSharesAxisRole(sourceScope, scope, guide.dimension);
    const selector = axisGridSelectorOf(guide);
    return selector !== undefined && selectorMatchesScope(selector, scope);
  };
  const gridGuidesForScope = (scope: CoordinateScopeRegistryEntry): Array<AxisGuide> =>
    allGuides.flatMap(guide =>
      isAxisGuide(guide) && axisGridTargetsScope(guide, scope) ? [withEnabledAxisGrid(guide, scope.id)] : [],
    );
  const assertSelectedGridTargetsScopes = (): void => {
    for (const guide of allGuides) {
      if (!isAxisGuide(guide) || axisGridApplyToOf(guide) !== AxisGridApplyTo.Selected) continue;
      const count = coordinateScopes.scopes.filter(scope => axisGridTargetsScope(guide, scope)).length;
      if (count === 0) {
        throw new Error(`lowerPlots: axis grid selector for dimension "${guide.dimension}" matches no target scope`);
      }
    }
  };
  const resolvedFrames = new Map<string, CoordinateFrameResolution & { scopeId: string }>();
  const scaffoldFrames = new Map<string, CoordinateFrameResolution>();
  const resolvingFrames = new Set<string>();
  const resolveScaffoldFrame = (scaffold: SharedScaffold): CoordinateFrameResolution => {
    const cached = scaffoldFrames.get(scaffold.id);
    if (cached !== undefined) return cached;
    const scaffoldRoles = rolesOf(scaffold.coordinate);
    for (const role of scaffold.sharedRoles) assertScaffoldRole(role, scaffoldRoles, scaffold.id);
    for (const track of scaffold.tracks) assertTrackRole(track.band.role, scaffoldRoles, scaffold.id);
    const scaffoldScopeIds = new Set((trackScopesByScaffold.get(scaffold.id) ?? []).map(scope => scope.id));
    const scaffoldMarkDataViews = markDataViews.filter(view =>
      scaffoldScopeIds.has(coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope)),
    );
    const scaffoldNode: PlotSpec = {
      ...node,
      coordinate: scaffold.coordinate,
      composition: undefined,
      marks: scaffoldMarkDataViews.map(view => view.mark),
      guides: [],
    };
    const resolved = resolveFrame({
      node: scaffoldNode,
      rows,
      fieldTypes,
      width,
      height,
      fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
      margin: frameMargin,
      labelGap: compositionLayout?.labelGap,
      provenance,
      coordinates: options.coordinates,
      scaleRegistry,
      markDataViews: scaffoldMarkDataViews,
    });
    scaffoldFrames.set(scaffold.id, resolved);
    return resolved;
  };
  const resolveScopedFrame = (scope: CoordinateScopeRegistryEntry): CoordinateFrameResolution & { scopeId: string } => {
    const cached = resolvedFrames.get(scope.id);
    if (cached !== undefined) return cached;
    if (resolvingFrames.has(scope.id)) {
      throw new Error(`lowerPlots: overlay coordinate scope cycle detected at "${scope.id}"`);
    }
    resolvingFrames.add(scope.id);
    const targetPlotArea =
      scope.placement?.kind === 'overlay'
        ? resolveScopedFrame(scopeById.get(scope.placement.target) ?? scope).plotArea
        : undefined;
    const trackPlacement = scope.placement?.kind === 'track' ? scope.placement : undefined;
    const scaffold = trackPlacement !== undefined ? scaffoldById.get(trackPlacement.scaffold) : undefined;
    const track =
      scaffold !== undefined && trackPlacement !== undefined
        ? scaffold.tracks.find(candidate => candidate.id === trackPlacement.track)
        : undefined;
    const scaffoldFrame = scaffold !== undefined ? resolveScaffoldFrame(scaffold) : undefined;
    const roleMarkDataViews: Record<string, Array<MarkDataView>> = {};
    const roleRangeOverrides: Partial<Record<DimensionRole, readonly [number, number]>> = {};
    if (scaffold !== undefined && track !== undefined && scaffoldFrame !== undefined) {
      const scopeRoles = rolesOf(scope.coordinate);
      const scaffoldScopeIds = new Set((trackScopesByScaffold.get(scaffold.id) ?? []).map(entry => entry.id));
      const scaffoldMarkDataViews = markDataViews.filter(view =>
        scaffoldScopeIds.has(coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope)),
      );
      for (const role of scaffold.sharedRoles) {
        assertScaffoldRole(role, scopeRoles, scaffold.id);
        roleMarkDataViews[role] = scaffoldMarkDataViews;
        roleRangeOverrides[role] = roleRangeOf(scaffoldFrame, role, `scaffold "${scaffold.id}"`);
      }
      assertTrackRole(track.band.role, scopeRoles, scope.id);
      const baseBandRange = roleRangeOf(scaffoldFrame, track.band.role, `scaffold "${scaffold.id}"`);
      roleRangeOverrides[track.band.role] = bandRangeOf(baseBandRange, track, scaffold);
    }
    const scopedMarkDataViews = markDataViews.filter(
      view => coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope) === scope.id,
    );
    if (scaffold === undefined) {
      for (const role of rolesOf(scope.coordinate)) {
        const scaleName = coordinateScaleNameOf(scope, role);
        if (scaleName === undefined) continue;
        const sharedViews = markDataViews.filter(view => {
          const viewScope = scopeById.get(coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope));
          return viewScope !== undefined && coordinateScaleNameOf(viewScope, role) === scaleName;
        });
        if (sharedViews.length > scopedMarkDataViews.length) roleMarkDataViews[role] = sharedViews;
      }
    }
    const scopedGuides = withoutAxisGrid(allGuides.filter(
      guide => !isAxisGuide(guide) || axisGuideScopeIdOf(guide, coordinateScopes.defaultScope) === scope.id,
    ));
    const scopedGridGuides = gridGuidesForScope(scope);
    const scopedNode: PlotSpec = {
      ...node,
      coordinate: scope.coordinate,
      composition: undefined,
      marks: scopedMarkDataViews.map(view => view.mark),
      guides: scopedGuides,
    };
    const rawResolution = resolveFrame({
      node: scopedNode,
      rows,
      fieldTypes,
      width,
      height,
      fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
      margin: frameMargin,
      labelGap: compositionLayout?.labelGap,
      ...(targetPlotArea !== undefined ? { plotAreaOverride: targetPlotArea } : {}),
      ...(scaffoldFrame !== undefined && (scaffold?.frame ?? 'shared') === 'shared'
        ? { plotAreaOverride: scaffoldFrame.plotArea }
        : {}),
      ...(Object.keys(roleRangeOverrides).length > 0 ? { roleRangeOverrides } : {}),
      provenance,
      coordinates: options.coordinates,
      scaleRegistry,
      markDataViews: scopedMarkDataViews,
      ...(Object.keys(roleMarkDataViews).length > 0 ? { roleMarkDataViews } : {}),
    });
    const gridResolution =
      scopedGridGuides.length > 0
        ? resolveFrame({
            node: { ...scopedNode, guides: scopedGridGuides },
            rows,
            fieldTypes,
            width,
            height,
            fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
            margin: frameMargin,
            labelGap: compositionLayout?.labelGap,
            plotAreaOverride: rawResolution.plotArea,
            ...(Object.keys(roleRangeOverrides).length > 0 ? { roleRangeOverrides } : {}),
            provenance,
            coordinates: options.coordinates,
            scaleRegistry,
            markDataViews: scopedMarkDataViews,
            ...(Object.keys(roleMarkDataViews).length > 0 ? { roleMarkDataViews } : {}),
          })
        : undefined;
    const scopeContext = scopeContextOf(scope);
    const resolved = {
      scopeId: scope.id,
      ...rawResolution,
      gridLayers: (gridResolution?.gridLayers ?? []).map(layer => withScopeContext(layer, scopeContext) as IRScope),
      axisLayers: rawResolution.axisLayers.map(layer => withScopeContext(layer, scopeContext) as IRScope),
    };
    resolvingFrames.delete(scope.id);
    resolvedFrames.set(scope.id, resolved);
    return resolved;
  };
  const facets = compositionFacets;
  if (facets.length === 0) assertSelectedGridTargetsScopes();
  const scopedFrames = coordinateScopes.scopes.map(resolveScopedFrame);
  const frameByScope = new Map(scopedFrames.map(scopeFrame => [scopeFrame.scopeId, scopeFrame.frame] as const));
  const gridLayers = scopedFrames.flatMap(scopeFrame => scopeFrame.gridLayers);
  const axisLayers = scopedFrames.flatMap(scopeFrame => scopeFrame.axisLayers);
  const plotArea = scopedFrames[0]?.plotArea ?? { x: 0, y: 0, width, height };

  const channelCtx = { node, rows, fieldTypes, scaleRegistry, resolveColorScheme };
  // 通道 registry：内置 definition 先注册，自定义 definition 再合并；mark / node / path 通道统一解析。
  const channelRegistry = resolveChannelRegistry({
    custom: options.channelDefinitions,
    resolveLabel: options.resolveLabel,
  });

  // plot 级 datum id 登记器：datumIdField + plotId 在时建一份，线穿全 mark——跨 mark 共享 seen，
  // 两 datum-bearing mark（point + bar）撞同 `<plotId>.datum.<value>` 即 fail loud（#2）。
  const registerDatumId: DatumIdRegistrar | undefined =
    provenance && provenance.datumIdField !== undefined && provenance.plotId !== undefined
      ? createDatumIdRegistrar(provenance.datumIdField, provenance.plotId)
      : undefined;
  const anchorRegistry = createAnchorRegistry({ plotId: node.id, generators: options.anchorIdGenerators });

  if (facets.length > 0) {
    const defaultScope = coordinateScopes.scopes.find(scope => scope.id === coordinateScopes.defaultScope);
    if (defaultScope === undefined) {
      throw new Error(`lowerPlots: default coordinate scope "${coordinateScopes.defaultScope}" is not registered`);
    }

    const usedFacetScopeIds = new Set(coordinateScopes.scopes.map(scope => scope.id));
    const panels = facets.flatMap(facet => resolveFacetPanels(facet, rows, usedFacetScopeIds));
    const maxColumnIndex = panels.reduce((max, panel) => Math.max(max, panel.columnIndex), 0);
    const maxRowIndex = panels.reduce((max, panel) => Math.max(max, panel.rowIndex), 0);
    const panelGap = compositionLayout?.panelGap ?? 0;
    const columnCount = maxColumnIndex + 1;
    const rowCount = maxRowIndex + 1;
    const panelWidth = (width - Math.max(0, columnCount - 1) * panelGap) / columnCount;
    const panelHeight = (height - Math.max(0, rowCount - 1) * panelGap) / rowCount;
    if (panelWidth <= 0 || panelHeight <= 0) {
      throw new Error(`lowerPlots: panelGap ${panelGap} leaves no room for ${columnCount}x${rowCount} facet panels`);
    }
    const facetGuides = allGuides.filter(
      guide => !isAxisGuide(guide) || axisGuideScopeIdOf(guide, coordinateScopes.defaultScope) === defaultScope.id,
    );
    const keepOuterSharedAxisForPanel = (guide: Guide, panel: FacetPanel): boolean => {
        if (!isAxisGuide(guide) || compositionAxisPolicy !== CompositionAxisPolicy.OuterShared) return true;
        const sharing = panel.facet.scales?.roles?.[guide.dimension] ?? 'shared';
        if (sharing === 'independent') return true;
        if (guide.dimension === 'x') return panel.rowIndex === maxRowIndex;
        if (guide.dimension === 'y') return panel.columnIndex === 0;
        return panel.rowIndex === 0 && panel.columnIndex === 0;
    };
    const selectorMatchesFacetPanel = (selector: GridTargetSelector, panel: FacetPanel): boolean => {
      if (selector.scopes?.includes(panel.id)) return true;
      if (selector.facet === undefined) return false;
      const facetMatches = selector.facet.id === undefined || selector.facet.id === panel.facet.id;
      const rowMatches = scalarSelectorIncludes(selector.facet.row, panel.row);
      const columnMatches = scalarSelectorIncludes(selector.facet.column, panel.column);
      return facetMatches && rowMatches && columnMatches;
    };
    const axisGridTargetsFacetPanel = (guide: AxisGuide, panel: FacetPanel): boolean => {
      const applyTo = axisGridApplyToOf(guide);
      if (applyTo === null) return false;
      if (applyTo === AxisGridApplyTo.Self || applyTo === AxisGridApplyTo.SharedRole) return true;
      const selector = axisGridSelectorOf(guide);
      return selector !== undefined && selectorMatchesFacetPanel(selector, panel);
    };
    const facetAxisGuidesForPanel = (panel: FacetPanel): Array<Guide> =>
      withoutAxisGrid(facetGuides.filter(guide => keepOuterSharedAxisForPanel(guide, panel)));
    const facetGridGuidesForPanel = (panel: FacetPanel): Array<Guide> =>
      facetGuides.flatMap(guide =>
        isAxisGuide(guide) && axisGridTargetsFacetPanel(guide, panel)
          ? [withEnabledAxisGrid(guide, undefined)]
          : [],
      );
    for (const guide of facetGuides) {
      if (!isAxisGuide(guide) || axisGridApplyToOf(guide) !== AxisGridApplyTo.Selected) continue;
      const count = panels.filter(panel => axisGridTargetsFacetPanel(guide, panel)).length;
      if (count === 0) {
        throw new Error(`lowerPlots: axis grid selector for dimension "${guide.dimension}" matches no target facet panel`);
      }
    }

    const panelScopes: Array<IRScope> = panels.map(panel => {
      const panelAxisGuides = facetAxisGuidesForPanel(panel);
      const panelMarkDataViews: Array<MarkDataView> = node.marks.map(mark => ({
        mark,
        rows: resolveMarkRows(mark, panel.rows, transformRegistry, transformContext),
      }));
      const roleMarkDataViews: Record<string, Array<MarkDataView>> = {};
      for (const [role, sharing] of Object.entries(panel.facet.scales?.roles ?? {})) {
        if (sharing === 'independent') roleMarkDataViews[role] = panelMarkDataViews;
      }
      const panelNode: PlotSpec = {
        ...node,
        coordinate: panel.facet.coordinate ?? defaultScope.coordinate,
        composition: undefined,
        marks: node.marks,
        guides: panelAxisGuides,
      };
      const frameResolution = resolveFrame({
        node: panelNode,
        rows: panel.rows,
        fieldTypes,
        width: panelWidth,
        height: panelHeight,
        fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
        margin: frameMargin,
        labelGap: compositionLayout?.labelGap,
        provenance,
        coordinates: options.coordinates,
        scaleRegistry,
        markDataViews,
        roleMarkDataViews,
      });
      const panelGridGuides = facetGridGuidesForPanel(panel);
      const gridResolution =
        panelGridGuides.length > 0
          ? resolveFrame({
              node: { ...panelNode, guides: panelGridGuides },
              rows: panel.rows,
              fieldTypes,
              width: panelWidth,
              height: panelHeight,
              fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
              margin: frameMargin,
              labelGap: compositionLayout?.labelGap,
              plotAreaOverride: frameResolution.plotArea,
              provenance,
              coordinates: options.coordinates,
              scaleRegistry,
              markDataViews,
              roleMarkDataViews,
            })
          : undefined;
      const facetContext: IRJsonObject = { id: panel.facet.id };
      if (panel.row !== undefined) facetContext.row = panel.row;
      if (panel.column !== undefined) facetContext.column = panel.column;
      const panelContext: IRJsonObject = { coordinateScope: panel.id, facet: facetContext };
      const markLayers: Array<IRChild> = node.marks
        .map((mark, markIndex) => {
          const markRows = panelMarkDataViews[markIndex]?.rows ?? panel.rows;
          const layer = lowerMark(
            mark,
            markRows,
            frameResolution.frame,
            resolveMarkChannels(
              mark,
              { ...channelCtx, rows: markRows },
              channelRegistry,
              defaultColorOf(node, markIndex),
              channelKindsForMark(mark, markRegistry),
            ),
            {
              markIndex,
              plotId: node.id,
              ...(provenance !== undefined ? { provenance: { context: provenance, markIndex, registerDatumId } } : {}),
              anchors: anchorRegistry,
            },
            markRegistry,
          );
          return layer === null ? null : withScopeContext(layer, panelContext);
        })
        .filter((layer): layer is IRChild => layer !== null);
      const meta: IRJsonObject = { source: 'plot', layer: 'facetPanel', facet: panel.facet.id };
      if (panel.row !== undefined) meta.row = panel.row;
      if (panel.column !== undefined) meta.column = panel.column;
      const base: IRScope = {
        type: 'scope',
        id: panel.id,
        localNamespace: true,
        meta,
        children: [
          ...(gridResolution?.gridLayers ?? []).map(layer => withScopeContext(layer, panelContext) as IRScope),
          ...markLayers,
          ...frameResolution.axisLayers.map(layer => withScopeContext(layer, panelContext) as IRScope),
        ],
      };
      if (panel.rowIndex === 0 && panel.columnIndex === 0) return base;
      return {
        ...base,
        transforms: [
          {
            kind: 'translate',
            x: panel.columnIndex * (panelWidth + panelGap),
            y: panel.rowIndex * (panelHeight + panelGap),
          },
        ],
      };
    });

    anchorRegistry.assertResolved();
    const children: Array<IRChild> = panelScopes;
    if (node.id === undefined) {
      const base: IRScope = { type: 'scope', localNamespace: true, children };
      return provenance ? { ...base, meta: rootMeta(provenance.dataReference) } : base;
    }

    const panelStrideX = panelWidth + panelGap;
    const panelStrideY = panelHeight + panelGap;
    const inner: IRScope = { type: 'scope', localNamespace: true, children };
    const innerContent: IRScope = provenance ? { ...inner, meta: rootMeta(provenance.dataReference) } : inner;
    const plotAreaCarrier: IRNode = {
      type: 'node',
      id: `${node.id}.plotArea`,
      position: [(maxColumnIndex * panelStrideX + panelWidth) / 2, (maxRowIndex * panelStrideY + panelHeight) / 2],
      shape: 'rectangle',
      minimumWidth: maxColumnIndex * panelStrideX + panelWidth,
      minimumHeight: maxRowIndex * panelStrideY + panelHeight,
      padding: 0,
      opacity: 0,
    };
    return { type: 'scope', id: node.id, children: [innerContent, plotAreaCarrier] };
  }

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  // provenance 开 → 传 markProvenance（plotId / markIndex / datum 开关 + 共享 registerDatumId），各层 / datum 绑 id + 来源 meta
  const scopeOrderById = new Map(coordinateScopes.scopes.map((scope, index) => [scope.id, index] as const));
  const markLayerEntries = node.marks
    .map((mark, markIndex) => {
      const markRows = markDataViews[markIndex]?.rows ?? rows;
      const coordinateScopeId = coordinateScopeIdOf(mark, coordinateScopes.defaultScope);
      const frame = frameByScope.get(coordinateScopeId);
      if (frame === undefined) {
        throw new Error(`lowerPlots: coordinateScope "${coordinateScopeId}" is not registered`);
      }
      const layer = lowerMark(
        mark,
        markRows,
        frame,
        resolveMarkChannels(
          mark,
          { ...channelCtx, rows: markRows },
          channelRegistry,
          defaultColorOf(node, markIndex),
          channelKindsForMark(mark, markRegistry),
        ),
        {
          markIndex,
          plotId: node.id,
          ...(provenance !== undefined ? { provenance: { context: provenance, markIndex, registerDatumId } } : {}),
          anchors: anchorRegistry,
        },
        markRegistry,
      );
      if (layer === null) return null;
      const scope = scopeById.get(coordinateScopeId);
      const scopedLayer = scope === undefined ? layer : withScopeContext(layer, scopeContextOf(scope));
      const declarationOrder = scopeOrderById.get(coordinateScopeId) ?? markIndex;
      const zIndex =
        scope?.placement?.kind === 'overlay' ? (scope.placement.zIndex ?? declarationOrder) : declarationOrder;
      return { layer: scopedLayer, markIndex, zIndex };
    })
    .filter((entry): entry is { layer: IRChild; markIndex: number; zIndex: number } => entry !== null);
  const markLayers: Array<IRChild> = markLayerEntries
    .sort((a, b) => a.zIndex - b.zIndex || a.markIndex - b.markIndex)
    .map(entry => entry.layer);
  anchorRegistry.assertResolved();

  // legend（ADR-03）：收 legend guide → 据通道 + scale 类型选形态下沉成独立 scope，落 position 预留带。
  // 占位（band 计算 / plotArea 收窄）见 reserveLegendBands；fail-loud（多 scale 未消歧 / scale 不存在）在 buildLegendLayers 内。
  const legendGuides = allGuides.filter(isLegendGuide);
  const legendLayers: Array<IRScope> = [];
  if (legendGuides.length > 0) {
    const channelDescriptors = collectChannelDescriptors(
      node,
      channelCtx,
      channelRegistry,
      markRegistry,
      markDataViews,
    );
    const bands = reserveLegendBands(legendGuides, width, height, plotArea);
    legendLayers.push(
      ...buildLegendLayers(
        node,
        channelDescriptors,
        legendGuides,
        options.fontSize ?? DEFAULT_FONT_SIZE,
        bands,
        scaleRegistry,
      ),
    );
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
export const lowerPlots = (datasets: ExternalDatasets, options: LowerPlotsOptions = {}): Array<CompositeDefinition> => [
  defineComposite({
    schema: PlotSpecSchema,
    expand: (node: PlotSpec) => expandPlot(node, datasets, options),
  }),
];
