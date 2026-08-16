import type { DataFieldTypeValue, ExternalRow } from '@retikz/data';

import { JsonObjectSchema } from '@retikz/core';
import { DataFieldType, FieldOrderMode, resolveFieldPath } from '@retikz/data';

import type { AnyCoordinateDefinition, DimensionRole, TickSet } from '../../contract';
import type {
  IRPlotAxisGuide,
  IRPlotChannel,
  IRPlotCoordinateOperation,
  IRPlotIntervalMark,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
  IRPlot,
} from '../../schemas';
import type { CategoryOrder } from '../scale';
import type { CoordinateFrameResolution, CoordinateResolveContext, MarkDataView } from './types';

import { isBuiltinScaleOperation } from '../../contract';
import {
  buildProportionalIntervals,
  channelValue,
  createPositionChannelDefinitions,
  proportionalIntervalDomainValues,
  resolveIntervalBound,
} from '../../providers';
import { IntervalBoundKind, isBuiltinMark, PathClosureKind, PlotGuide, PlotMark, PlotScale } from '../../schemas';
import {
  assertBaselineScaleCompatible,
  assertScaleFieldCompatible,
  derivePositionScale,
  orderedCategoryDomain,
  resolvePositionScale,
} from '../scale';

/** 查找当前 coordinate operation 对应的 definition，并集中报告未注册坐标系 */
export const resolveCoordinateDefinition = (
  operation: IRPlotCoordinateOperation,
  context: Pick<CoordinateResolveContext, 'coordinateRegistry'>,
): AnyCoordinateDefinition => {
  const definition = context.coordinateRegistry.get(operation.type);
  if (definition === undefined) {
    throw new Error(
      `lowerPlots: coordinate type "${operation.type}" is not registered; pass a CoordinateDefinition via options.coordinates`,
    );
  }
  return definition;
};

/**
 * interval mark 在某位置 role 对 scale 域的贡献值（按 bounds 来源）
 * @description band / span → 取 encoding 位置通道值（band 为类别、span 为值，baseline 由 includeBaseline 纳入）；
 *   extent → 取两字段（histogram 箱边 / 堆叠 y0,y1 / 累积饼角 start,end）；full → 不贡献（满铺坐标域）
 */
const intervalRoleValues = (
  mark: IRPlotIntervalMark,
  axis: 'primary' | 'secondary',
  pick: (mark: IRPlotMarkOperation) => IRPlotChannel | undefined,
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
const intervalContributesBaseline = (mark: IRPlotIntervalMark, axis: 'primary' | 'secondary'): boolean => {
  const bound = resolveIntervalBound(mark, axis === 'primary' ? 'x' : 'y');
  return (
    bound.kind === IntervalBoundKind.Span ||
    bound.kind === IntervalBoundKind.Extent ||
    bound.kind === IntervalBoundKind.Proportional
  );
};

const intervalBoundConsumesRoleChannel = (mark: IRPlotIntervalMark, role: DimensionRole): boolean => {
  const bound = resolveIntervalBound(mark, role);
  return bound.kind === IntervalBoundKind.Band || bound.kind === IntervalBoundKind.Span;
};

const intervalProportionalAxisTicks = (
  mark: IRPlotIntervalMark,
  role: DimensionRole,
  rows: Array<ExternalRow>,
): TickSet | undefined => {
  const bound = resolveIntervalBound(mark, role);
  if (bound.kind !== IntervalBoundKind.Proportional) return undefined;
  const channel = (mark.encoding as Record<string, IRPlotChannel | undefined>)[role];
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

const relationTargetRoleValues = (
  mark: IRPlotMarkOperation,
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

/** 读 mark 的 encoding（内置与自定义共享 EncodingSchema 形态）；自定义 mark 缺 encoding 时 undefined */
const markEncoding = (mark: IRPlotMarkOperation): Record<string, IRPlotChannel | undefined> | undefined =>
  (mark as { encoding?: Record<string, IRPlotChannel | undefined> }).encoding;

/** 非位置 encoding key：这些键有专属语义，不参与 CoordinateDefinition.roles 校验 */
const NON_POSITION_ENCODING_KEYS = new Set<string>(['color', 'text', 'channels']);

/**
 * 校验内置 mark 的 encoding key 是否属于当前坐标系角色。
 * @description schema 允许未知 key 承载自定义坐标系位置角色；lowering 必须按 active CoordinateDefinition.roles
 *   fail-loud，避免把 `size` / `opacity` 这类拼错或误放进 encoding 的字段静默当成无效位置角色
 */
const assertKnownPositionEncodingRoles = (
  coordinateType: string,
  roles: ReadonlyArray<DimensionRole>,
  marks: ReadonlyArray<IRPlotMarkOperation>,
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
 * 按坐标系合法集校验每根 axis guide 的 dimension
 * @description 非法 dimension（如 cartesian 下 'angle'）fail-loud，给出清晰错误。
 */
const assertValidGuideDimensions = (
  coordinateType: string,
  roles: ReadonlyArray<DimensionRole>,
  axisGuides: Array<IRPlotAxisGuide>,
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
 * 按坐标系必填角色集校验每个位置 mark 的 encoding
 * @description sector 无位置通道（角度来自累积界）→ 跳过；其余 mark 缺任一必填角色通道 → fail-loud。
 */
const assertRequiredPositionChannels = (
  coordinateType: string,
  roles: ReadonlyArray<DimensionRole>,
  marks: ReadonlyArray<IRPlotMarkOperation>,
): void => {
  const required = roles;
  for (const mark of marks) {
    // 自定义 mark：必填位置通道由其 MarkDefinition.lower 自行 fail-loud，不在通用校验内强制
    if (!isBuiltinMark(mark)) continue;
    // reference 取向由 encoding.x XOR y 决定（绑一个、缺一个）；其取向校验在 lowerReference fail-loud
    if (mark.type === PlotMark.Reference || mark.type === PlotMark.Relation) continue;
    // interval：band / span bounds 需对应 encoding 位置通道；extent（字段区间）/ full（满域）从字段 / 坐标系取位置，豁免该角色
    if (mark.type === PlotMark.Interval) {
      const encoding = mark.encoding as Record<string, IRPlotChannel | undefined>;
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
    const encoding = mark.encoding as Record<string, IRPlotChannel | undefined>;
    for (const channel of required) {
      if (encoding[channel] === undefined) {
        throw new Error(
          `lowerPlots: ${coordinateType} coordinate system requires the "${channel}" position channel on ${mark.type} marks, but it is missing`,
        );
      }
    }
  }
};

/**
 * 按坐标系解析出 mark / guide 共用的投影帧 + 下沉 guide 层
 * @description cartesian：x/y 角色绑 x/y scale、走 plotArea + 直线轴；polar：angle/radius 角色、走 polar layout + 弧 / 辐条轴。
 *   抽成纯函数使 mark 下沉与 locator 共用同一投影，杜绝两套投影漂移。
 */
export const resolveCoordinateFrame = (
  source: IRPlot,
  context: CoordinateResolveContext,
): CoordinateFrameResolution => {
  const {
    rows,
    fieldTypes,
    width,
    height,
    fontSize,
    labelGap,
    margin,
    layoutReserve,
    plotAreaOverride,
    roleRangeOverrides,
    scaleRegistry,
    provenance,
    coordinateRegistry,
    lowerGuide,
    lowerCustomAxis,
  } = context;
  const node = source;
  const markDataViews = context.markDataViews ?? node.marks.map(mark => ({ mark, rows }));
  const markDataViewsForRole = (role: DimensionRole): Array<MarkDataView> =>
    context.roleMarkDataViews?.[role] ?? markDataViews;
  const coordinateOperation = context.coordinate ?? node.coordinate;
  if (coordinateOperation === undefined) {
    throw new Error('lowerPlots: default coordinate view is not registered');
  }
  const coordinateDefinition = resolveCoordinateDefinition(coordinateOperation, { coordinateRegistry });
  const roles = coordinateDefinition.roles;
  const axisGuides = (node.guides ?? []).filter((guide): guide is IRPlotAxisGuide => guide.type === PlotGuide.Axis);
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  const positionChannels = createPositionChannelDefinitions(roles);

  // 建 frame 前校验：guide 维度按坐标系合法集校验 + mark 必填位置角色校验，均 fail-loud。
  assertValidGuideDimensions(coordinateOperation.type, roles, axisGuides);
  assertKnownPositionEncodingRoles(coordinateOperation.type, roles, node.marks);
  assertRequiredPositionChannels(coordinateOperation.type, roles, node.marks);

  // 收集某角色（位置 scale 名 + 通道角色）下所有 mark 的通道原始值（不预过滤）：
  //   连续 scale 内部过滤为有限数求 extent、分类 scale 按数据序去重推断 domain。
  // role 决定从哪个通道取值：cartesian 用 x/y；polar 用 angle??x / radius??y（mark 不写死笛卡尔）。
  const collectValues = (
    role: DimensionRole,
    axis: 'primary' | 'secondary' | undefined,
    pick: (mark: IRPlotMarkOperation) => IRPlotChannel | undefined,
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
    pick: (mark: IRPlotMarkOperation) => IRPlotChannel | undefined,
  ): Array<DataFieldTypeValue> => {
    const types: Array<DataFieldTypeValue> = [];
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
   * @description 收集该 role 各绑定字段的非默认 order（!=='appearance'）：非分类字段配 order → throw；
   *   ≥2 个不同非默认 order → throw；恰好 1 个 → 返回它；0 个 → undefined（保持现状出现序）。
   */
  const resolveRoleOrder = (
    role: DimensionRole,
    pick: (mark: IRPlotMarkOperation) => IRPlotChannel | undefined,
  ): CategoryOrder | undefined => {
    const found: Array<CategoryOrder> = [];
    for (const mark of node.marks) {
      if (isBuiltinMark(mark) && mark.type === PlotMark.Interval && !intervalBoundConsumesRoleChannel(mark, role))
        continue;
      const channel = pick(mark);
      if (channel?.field === undefined) continue;
      const order = fieldOrders.get(channel.field);
      if (order === undefined || order === FieldOrderMode.Appearance) continue;
      const type = fieldTypes.get(channel.field);
      if (type !== undefined && type !== DataFieldType.Categorical) {
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

  // 解析角色 scale：显式绑定 → 查表（未声明仍抛，typo 守卫）+ 对该 role **全部**字段做兼容校验；
  //   省略 → 按字段类型派生（要求该 role 字段类型一致，混类型 fail-loud）。兼容校验只对「声明 model 的类型」生效。
  const resolveScaleForRole = (
    role: DimensionRole,
    scaleName: string | undefined,
    pick: (mark: IRPlotMarkOperation) => IRPlotChannel | undefined,
    values: Array<unknown>,
  ): IRPlotScaleOperation => {
    const types = roleFieldTypes(role, pick);
    // 解析该 role 有效 order（含「非分类配 order」「冲突 order」两道 fail-loud），无论 scale 显式与否都先校验
    const order = resolveRoleOrder(role, pick);
    let def: IRPlotScaleOperation;
    if (scaleName !== undefined) {
      const found = scaleByName.get(scaleName);
      if (!found) throw new Error(`lowerPlots: coordinate.${role} references unknown scale "${scaleName}"`);
      if (node.data.model !== undefined) {
        for (const type of types)
          assertScaleFieldCompatible(role, found.type, type, scaleName, { registry: scaleRegistry });
      }
      def = found;
    } else {
      const distinct = [...new Set(types)];
      if (distinct.length > 1) {
        throw new Error(
          `lowerPlots: coordinate.${role} omitted but its bound fields have mixed types [${distinct.join(', ')}]; declare an explicit scale`,
        );
      }
      def = derivePositionScale(distinct[0], `__${role}`);
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
  ): IRPlotScaleOperation => resolveScaleForRole(role, scaleName, roleChannelOf(role), values);

  // legend 预留：按 position 在对应边让出带宽，plotArea 据此收窄（决策 ⑩）
  JsonObjectSchema.parse(coordinateOperation);
  const parsedCoordinateOperation = coordinateDefinition.schema.parse(coordinateOperation) as never;
  JsonObjectSchema.parse(parsedCoordinateOperation);
  const resolution = coordinateDefinition.resolve(parsedCoordinateOperation, {
    width,
    height,
    fontSize,
    ...(labelGap !== undefined ? { labelGap } : {}),
    ...(margin !== undefined ? { margin } : {}),
    ...(layoutReserve !== undefined ? { layoutReserve } : {}),
    legendReserve: context.legendReserve ?? {},
    ...(plotAreaOverride !== undefined ? { plotAreaOverride } : {}),
    ...(roleRangeOverrides !== undefined ? { roleRangeOverrides } : {}),
    ...(provenance !== undefined ? { provenance } : {}),
    collectRoleValues: (role, opts) =>
      collectValues(role, undefined, roleChannelOf(role), opts?.includeBaseline ?? false),
    collectPositionValues: (role, opts) =>
      collectValues(role, opts?.axis, roleChannelOf(role), opts?.includeBaseline ?? false),
    collectAxisTicks,
    resolveGuideTicks: context.resolveGuideTicks,
    resolveVisibleGuideTicks: context.resolveVisibleGuideTicks,
    resolveScaleForRole: resolveScaleForDefinitionRole,
    buildPositionScale: (def, values, range) =>
      resolvePositionScale(def, values, [range[0], range[1]], { registry: scaleRegistry }),
    assertBaselineScaleCompatible: (scaleType, marks) =>
      assertBaselineScaleCompatible(scaleType, marks, { registry: scaleRegistry }),
    axisGuides,
    lowerGuide,
    lowerCustomAxis,
    rows,
    marks: node.marks,
  });
  if (resolution.frame.type !== coordinateOperation.type) {
    throw new Error(
      `lowerPlots: coordinate definition "${coordinateOperation.type}" returned frame type "${resolution.frame.type}"; frame type must match the registered coordinate type`,
    );
  }
  if (
    resolution.frame.roles.length !== roles.length ||
    resolution.frame.roles.some((role, index) => role !== roles[index])
  ) {
    throw new Error(
      `lowerPlots: coordinate definition "${coordinateOperation.type}" returned frame roles [${resolution.frame.roles.join(', ')}]; frame roles must match definition roles [${roles.join(', ')}]`,
    );
  }
  return {
    frame: resolution.frame,
    gridLayers: resolution.gridLayers,
    axisLayers: resolution.axisLayers,
    plotArea: resolution.plotArea,
  };
};
